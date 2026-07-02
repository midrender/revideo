import type {SignalValue, SimpleSignal} from '@revideo/core';
import {DependencyContext, useLogger} from '@revideo/core';
import type {LiteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor';
import type {MathDocument} from 'mathjax-full/js/core/MathDocument';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html';
import {TeX} from 'mathjax-full/js/input/tex';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages';
import {mathjax} from 'mathjax-full/js/mathjax';
import {SVG} from 'mathjax-full/js/output/svg';
import type {OptionList} from 'mathjax-full/js/util/Options';
import {initial, signal} from '../decorators';
import type {ImgProps} from './Img';
import {Img} from './Img';

export interface LatexProps extends ImgProps {
  tex?: SignalValue<string>;
  renderProps?: SignalValue<OptionList>;
}

/**
 * A node for rendering equations with LaTeX.
 *
 * @preview
 * ```tsx editor
 * import {Latex, makeScene2D} from '@revideo/2d';
 *
 * export default makeScene2D('scene', function* (view) {
 *   view.add(
 *     <Latex
 *       // Note how this uses \color to set the color.
 *       tex="{\color{white} ax^2+bx+c=0 \implies x=\frac{-b \pm \sqrt{b^2-4ac}}{2a}}"
 *       width={600} // height and width can calculate based on each other
 *     />,
 *   );
 * });
 * ```
 */
export class Latex extends Img {
  private static svgContentsPool: Record<string, string> = {};
  private static mathJaxInitialized = false;
  private static adaptor: LiteAdaptor;
  private static jaxDocument: MathDocument<unknown, unknown, unknown>;

  private static initializeMathJax() {
    if (this.mathJaxInitialized) {
      return;
    }
    this.adaptor = liteAdaptor();
    RegisterHTMLHandler(this.adaptor);
    this.jaxDocument = mathjax.document('', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      InputJax: new TeX({packages: AllPackages}),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      OutputJax: new SVG({fontCache: 'local'}),
    });
    this.mathJaxInitialized = true;
  }

  private readonly imageElement = document.createElement('img');

  @initial({})
  @signal()
  public declare readonly options: SimpleSignal<OptionList, this>;

  @signal()
  public declare readonly tex: SimpleSignal<string, this>;

  public constructor(props: LatexProps) {
    super({...props, src: null});
    Latex.initializeMathJax();
  }

  protected override image(): HTMLImageElement {
    // Render props may change the look of the TeX, so we need to cache both
    // source and render props together.
    const src = `${this.tex()}::${JSON.stringify(this.options())}`;
    if (Latex.svgContentsPool[src]) {
      this.imageElement.src = Latex.svgContentsPool[src];
      if (!this.imageElement.complete) {
        DependencyContext.collectPromise(
          new Promise((resolve, reject) => {
            this.imageElement.addEventListener('load', resolve);
            this.imageElement.addEventListener('error', reject);
          }),
        );
      }
      return this.imageElement;
    }

    // Convert to TeX, look for any errors
    const tex = this.tex();
    const svg = Latex.adaptor.innerHTML(
      Latex.jaxDocument.convert(tex, this.options()) as any,
    );
    if (svg.includes('data-mjx-error')) {
      const errors = svg.match(/data-mjx-error="(.*?)"/);
      if (errors && errors.length > 0) {
        useLogger().error(`Invalid MathJax: ${errors[1]}`);
      }
    }

    // Encode to raw base64 image format
    const text = `data:image/svg+xml;base64,${btoa(
      `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n${svg}`,
    )}`;
    Latex.svgContentsPool[src] = text;
    const image = document.createElement('img');
    image.src = text;
    image.src = text;
    if (!image.complete) {
      DependencyContext.collectPromise(
        new Promise((resolve, reject) => {
          image.addEventListener('load', resolve);
          image.addEventListener('error', reject);
        }),
      );
    }

    return image;
  }
}
