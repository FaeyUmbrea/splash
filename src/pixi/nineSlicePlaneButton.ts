import { ButtonImage, ButtonLabel } from "../types/button.js";

interface NineSlicePlaneButtonSettings {
  width?: number;
  height?: number;

  onTap: (() => void) | (() => Promise<void>);

  label: ButtonLabel;
  image: ButtonImage;

  hoverLabel?: ButtonLabel;
  hoverImage?: ButtonImage;

  clickLabel?: ButtonLabel;
  clickImage?: ButtonImage;

  tint?: string;
  hoverTint?: string;
  clickTint?: string;
}

export default class NineSlicePlaneButton extends PIXI.NineSlicePlane {
  private settings: NineSlicePlaneButtonSettings;
  private readonly label: PIXI.Text;
  private isOver: boolean = false;
  private isActive: boolean = false;

  private currentImage: ButtonImage;

  constructor(settings: NineSlicePlaneButtonSettings) {
    const texture: PIXI.Texture = PIXI.Texture.from(settings.image.url);
    super(
      texture,
      settings.image.leftWidth,
      settings.image.topHeight,
      settings.image.rightWidth,
      settings.image.bottomHeight,
    );
    this.currentImage = settings.image;

    this.settings = settings;

    // Main text on the button
    this.label = new PIXI.Text("");
    this.label.anchor.set(0.5);
    this.addChild(this.label);

    // Update visual appearance
    this.update();

    this.interactive = true;

    this.cursor = "pointer";

    /** Bind functions on this context as long as we will use them as event handlers */
    this.onTap = this.onTap.bind(this);
    this.onOver = this.onOver.bind(this);
    this.onOut = this.onOut.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);

    this.on("pointertap", this.onTap); // The moment when we release (click/tap) the button
    this.on("pointerover", this.onOver); // The moment when we put the cursor over the button
    this.on("pointerout", this.onOut); // The moment when we put the cursor out of the button
    this.on("pointerdown", this.onDown); // The moment when we pressed on the button but didn't release yet
    this.on("pointerup", this.onUp); // The moment when we release the button
    this.on("pointerupoutside", this.onUp); // The moment when we release the button being outside of it (e.g. we press on the button, move the cursor out of it, and release)
  }

  onTap() {
    if (this.settings.onTap) this.settings.onTap();
  }

  onOver() {
    this.isOver = true;
    this.update();
  }

  onOut() {
    this.isOver = false;
    this.update();
  }

  onDown() {
    this.isActive = true;
    this.update();
  }

  onUp() {
    this.isActive = false;
    this.update();
  }

  /** Updates the button's appearance after changing its settings */
  update(settings: NineSlicePlaneButtonSettings | undefined = undefined) {
    // Creating new settings which include old ones and apply new ones over it
    if (settings) {
      this.settings = {
        ...this.settings, // including old settings
        ...settings, // including new settings
      };
    }

    let label = this.settings.label;
    if (this.isActive) {
      if (this.settings.clickTint) this.tint = this.settings.clickTint;
      if (this.settings.clickImage) {
        this.updateImage(this.settings.clickImage);
      }
      label = this.settings.clickLabel ?? label;
    } else if (this.isOver) {
      if (this.settings.hoverTint) this.tint = this.settings.hoverTint;
      if (this.settings.hoverImage) {
        this.updateImage(this.settings.hoverImage);
      }
      label = this.settings.hoverLabel ?? label;
    } else {
      if (this.settings.tint) this.tint = this.settings.tint ?? "#ffffff";
      if (this.settings.image) this.updateImage(this.settings.image);
    }

    this.label.text = label.text;
    this.label.style = {
      fontSize: label.fontSize + "px",
      fill: label.fill,
      stroke: label.stroke,
      strokeThickness: label.strokeThickness,
    };

    this.onResize();
  }

  updateImage(image: ButtonImage) {
    if (this.currentImage.url !== image.url) {
      this.texture = PIXI.Texture.from(image.url);
      this.currentImage = image;
      this.leftWidth = image.leftWidth;
      this.rightWidth = image.rightWidth;
      this.topHeight = image.topHeight;
      this.bottomHeight = image.bottomHeight;
      this.textureUpdated();
    }
  }

  /** Changes sizes and positions each time when the button updates */
  onResize() {
    this.width = this.settings.width ?? 400;
    this.height = this.settings.height ?? 200;

    this.label.x = this.width * 0.5;
    this.label.y = this.height * 0.5;

    this.pivot.set(this.width * 0.5, this.height * 0.5);
  }
}
