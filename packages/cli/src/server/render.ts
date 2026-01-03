import {renderVideo} from '@revideo/renderer';
import axios from 'axios';
import type {Request, Response} from 'express';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
import {scheduleCleanup} from '../utils';
import {validateRenderRequest} from './validation';

export async function render(req: Request, res: Response) {
  // Validate request body
  const validation = validateRenderRequest(req);
  if (!validation.valid) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid request body',
      errors: validation.errors,
    });
    return;
  }

  const {callbackUrl} = req.body;
  if (callbackUrl) {
    await renderWithCallback(req, res);
  } else {
    await renderWithoutCallback(req, res);
  }
}

async function renderWithCallback(req: Request, res: Response) {
  const {variables, callbackUrl, settings} = req.body;
  const tempProjectName = uuidv4();
  const outputFileName = `${tempProjectName}.mp4`;
  res.json({tempProjectName});

  try {
    await renderVideo({
      projectFile: process.env.PROJECT_FILE || '',
      variables,
      settings: {
        ...settings,
        outFile: outputFileName,
      },
    });

    const resultFilePath = path.join(process.cwd(), `output/${outputFileName}`);

    const downloadLink = `${req.protocol}://${req.get('host')}/download/${outputFileName}`;

    const response = await axios.post(
      callbackUrl,
      {
        tempProjectName,
        status: 'success',
        downloadLink,
      },
      {
        headers: {
          // eslint-disable-next-line
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status !== 200) {
      throw new Error('Callback URL responded with an error');
    }

    scheduleCleanup(resultFilePath);
  } catch (error: any) {
    console.error(error);
    await axios.post(
      callbackUrl,
      {
        tempProjectName,
        status: 'error',
        error: error.message,
      },
      {
        headers: {
          // eslint-disable-next-line
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

async function renderWithoutCallback(req: Request, res: Response) {
  const {variables, streamProgress, settings} = req.body;
  const tempProjectName: `${string}.mp4` = `${uuidv4()}.mp4`;
  const resultFilePath = path.join(process.cwd(), `output/${tempProjectName}`);

  if (streamProgress) {
    res.writeHead(200, {
      // eslint-disable-next-line
      'Content-Type': 'text/event-stream',
      // eslint-disable-next-line
      'Cache-Control': 'no-cache',
      // eslint-disable-next-line
      Connection: 'keep-alive',
    });

    const sendProgress = (worker: number, progress: number) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify({worker, progress})}\n\n`);
    };

    try {
      await renderVideo({
        projectFile: process.env.PROJECT_FILE || '',
        variables,
        settings: {
          ...settings,
          outFile: tempProjectName,
          progressCallback: sendProgress,
        },
      });

      const downloadLink = `${req.protocol}://${req.get('host')}/download/${tempProjectName}`;
      res.write(`event: completed\n`);
      res.write(
        `data: ${JSON.stringify({status: 'success', downloadLink})}\n\n`,
      );
      res.end();
      scheduleCleanup(resultFilePath);
    } catch (error: any) {
      console.error(error);
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({status: 'error', message: error.message})}\n\n`,
      );
      res.end();
    }
  } else {
    try {
      await renderVideo({
        projectFile: process.env.PROJECT_FILE || '',
        variables,
        settings: {
          ...settings,
          outFile: tempProjectName,
        },
      });

      const downloadLink = `${req.protocol}://${req.get('host')}/download/${tempProjectName}`;

      res.json({
        status: 'success',
        downloadLink: downloadLink,
      });
      scheduleCleanup(resultFilePath);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}
