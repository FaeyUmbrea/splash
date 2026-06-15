import type { ButtonImageInitialized as ButtonImage, ButtonLabelInitialized as ButtonLabel } from '../datamodel/SplashModel.ts';

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
		// Empty url = an asset-free (solid, tintable) button; PIXI.Texture.from('') would throw.
		const texture: PIXI.Texture = settings.image.url ? PIXI.Texture.from(settings.image.url) : PIXI.Texture.WHITE;
		super(
			texture,
			settings.image.leftWidth ?? 0,
			settings.image.topHeight ?? 0,
			settings.image.rightWidth ?? 0,
			settings.image.bottomHeight ?? 0,
		);
		this.currentImage = settings.image;

		this.settings = settings;

		this.label = new PIXI.Text('');
		this.label.anchor.set(0.5);
		this.addChild(this.label);

		this.update();

		this.interactive = true;

		this.cursor = 'pointer';

		this.onTap = this.onTap.bind(this);
		this.onOver = this.onOver.bind(this);
		this.onOut = this.onOut.bind(this);
		this.onDown = this.onDown.bind(this);
		this.onUp = this.onUp.bind(this);

		this.on('pointertap', this.onTap);
		this.on('pointerover', this.onOver);
		this.on('pointerout', this.onOut);
		this.on('pointerdown', this.onDown);
		this.on('pointerup', this.onUp);
		this.on('pointerupoutside', this.onUp);
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

	update(
		settings: Partial<NineSlicePlaneButtonSettings> | undefined = undefined,
	) {
		if (settings) {
			this.settings = {
				...this.settings,
				...settings,
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
			if (this.settings.tint) this.tint = this.settings.tint ?? '#ffffff';
			if (this.settings.image) this.updateImage(this.settings.image);
		}

		this.label.text = label.text;
		this.label.style = {
			fontSize: `${label.fontSize}px`,
			fill: label.fill,
			stroke: label.stroke,
			strokeThickness: label.strokeThickness ?? 1,
		};

		this.onResize();
	}

	updateImage(image: ButtonImage) {
		if (this.currentImage.url !== image.url) {
			this.texture = image.url ? PIXI.Texture.from(image.url) : PIXI.Texture.WHITE;
			this.currentImage = image;
			this.leftWidth = image.leftWidth ?? 0;
			this.rightWidth = image.rightWidth ?? 0;
			this.topHeight = image.topHeight ?? 0;
			this.bottomHeight = image.bottomHeight ?? 0;
			this.textureUpdated();
		}
	}

	onResize() {
		this.width = this.settings.width ?? 400;
		this.height = this.settings.height ?? 200;

		this.label.x = this.width * 0.5;
		this.label.y = this.height * 0.5;

		// No pivot offset: position means top-left for every sprite type in both renderers.
		this.pivot.set(0, 0);
	}
}
