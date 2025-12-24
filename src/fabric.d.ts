declare module 'fabric' {
  export namespace fabric {
    export class Canvas {
      constructor(element: HTMLCanvasElement | string, options?: any);
      getContext(): CanvasRenderingContext2D | null;
      getObjects(): Object[];
      getActiveObject(): Object | null;
      getActiveObjects(): Object[];
      setActiveObject(object: Object | null): void;
      discardActiveObject(): void;
      add(...objects: Object[]): Canvas;
      remove(...objects: Object[]): Canvas;
      renderAll(): Canvas;
      setZoom(zoom: number): Canvas;
      getZoom(): number;
      zoomToPoint(point: { x: number; y: number }, zoom: number): Canvas;
      setViewportTransform(vpt: number[]): Canvas;
      getViewportTransform(): number[];
      viewportTransform?: number[];
      relativePan(point: { x: number; y: number }): Canvas;
      getPointer(e: any): { x: number; y: number };
      findTarget(e: any, skipGroup?: boolean): any;
      toJSON(propertiesToInclude?: string[]): string;
      loadFromJSON(json: string, callback?: () => void, reviver?: (o: any, type: string) => any): void;
      dispose(): void;
      setDimensions(dimensions: { width: number; height: number }): Canvas;
      width?: number;
      height?: number;
      isDrawingMode: boolean;
      freeDrawingBrush: any;
      defaultCursor: string;
      selection: boolean;
      skipTargetFind: boolean;
      backgroundColor?: string;
      on(event: string, handler: (...args: any[]) => void): Canvas;
      off(event: string, handler: (...args: any[]) => void): Canvas;
    }

    export class Object {
      type: string;
      left?: number;
      top?: number;
      scaleX?: number;
      scaleY?: number;
      angle?: number;
      flipX?: boolean;
      flipY?: boolean;
      opacity?: number;
      width?: number;
      height?: number;
      fill?: string;
      set(key: string | any, value?: any): Object;
      set(properties: { [key: string]: any }): Object;
      clone(callback: (cloned: Object) => void): void;
      toDataURL(options?: { format?: string; quality?: number; multiplier?: number }): string;
      getBoundingRect(): { left: number; top: number; width: number; height: number };
      on(event: string, handler: (...args: any[]) => void): Object;
      bringToFront(): Object;
    }

    export class Image extends Object {
      static fromURL(url: string, callback: (img: Image) => void, options?: any): void;
      scaleToWidth(width: number): Image;
      getElement(): HTMLImageElement | null;
    }

    export class Text extends Object {
      text?: string;
      fontFamily?: string;
      fontSize?: number;
      constructor(text: string, options?: any);
    }

    export class IText extends Text {
      constructor(text: string, options?: any);
    }
    
    export class Textbox extends Text {
      constructor(text: string, options?: any);
    }

    export class Rect extends Object {
      constructor(options?: any);
    }
    
    export class Circle extends Object {
      constructor(options?: any);
    }
    
    export class Path extends Object {
      constructor(path?: string | any[], options?: any);
    }
  }

  export const fabric: typeof fabric;
  export default fabric;
}


