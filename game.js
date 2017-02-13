
/* Encapsulating a section of a texture atlas along with pre-rendering
 * image    : The texture atlas.
 * selection: An {x, y, w, h, dw, dh} object denoting the section of the
 *            texture atlas to use. The dw and dh properties (defaulting to
 *            w and h) store the display size of the sprite (which may
 *            differ from the size on the spritesheet). Must be present.
 * transform: Currently, null (for none) or one of the following keywords:
 *            rotCW : Rotate clockwise by ninety degrees.
 *            rotCCW: Rotate counterclockwise by ninety degrees.
 *            turn  : Rotate by 180 degrees. */
function Sprite(image, selection, transform) {
  if (selection.dw == null) selection.dw = selection.w;
  if (selection.dh == null) selection.dh = selection.h;
  this.image = image;
  this.selection = selection;
  this.transform = transform;
  this._atlas = null;
  this._atlasSelection = null;
}

Sprite.prototype = {
  /* Render this sprite to the given drain at the given x, y cooridinates */
  render: function(drain, x, y) {
    if (this._atlas) {
      var im = this._atlas, sel = this._atlasSelection;
      drain.drawImage(im, sel.x, sel.y, sel.w, sel.h, x, y, sel.dw, sel.dh);
    } else {
      var im = this.image, sel = this.selection, tr = this.transform;
      drain.save();
      switch (tr) {
        case "rotCW": drain.transform(0, 1, -1, 0, sel.w, 0); break;
        case "rotCCW": drain.transform(0, -1, 1, 0, 0, sel.h); break;
        case "turn": drain.transform(-1, 0, 0, -1, sel.w, sel.h); break;
      }
      drain.drawImage(im, sel.x, sel.y, sel.w, sel.h, x, y, sel.dw, sel.dh);
      drain.restore();
    }
  },

  /* Pre-render the sprite into the given atlas
   * If atlas is null, the current prerendering is cleared (as it is in
   * any case), and no new one is created. */
  preRender: function(atlas, x, y) {
    this._atlas = null;
    this._atlasSelection = null;
    if (atlas != null) {
      this.render(atlas, x, y);
      this._atlas = atlas;
      this._atlasSelection = {x: x, y: y, w: this.selection.w,
        h: this.selection.h, dw: this.selection.w, dh: this.selection.h};
    }
  }
};

/* Wrapper around a collection of prerendered Sprite-s
 * image: The spritesheet common to the sprites
 * descs: Object mapping sprite names to objects sharing the format with
 *        Sprite.selection, with the "transform" attribute stored as an
 *        additional property, if any. The "bg" property can be either a
 *        color (starting with a '#' sign) or a sprite name, which is
 *        used as the background for the sprite (for precompositing).
 * Attributes:
 * sprites: Actual sprite storage. Computed by the compose() method.
 */
function SpriteSheet(image, descs) {
  this.image = image;
  this.descs = descs;
  this._atlas = null;
  this.sprites = null;
}

SpriteSheet.prototype = {
  /* Compose the spritesheet */
  compose: function() {
    /* Arbitrarily choosing the spritesheet's width.
     * Box packing problems are already hard without that. */
    var width = this.image.width;
    var x = 0, y = 0, l = 0, lh = 0;
    for (var name in this.descs) {
      if (! this.descs.hasOwnProperty(name)) continue;
      var desc = this.descs[name];
      if (desc.dw == null) desc.dw = desc.w;
      if (desc.dh == null) desc.dh = desc.h;
      /* Check if it fits */
      if (x + desc.dw > width) {
        x = 0;
        y += lh;
        l++;
        lh = 0;
      }
      desc._ax = x;
      desc._ay = y;
      x += desc.dw;
      if (lh < desc.dh) lh = desc.dh;
    }
    var height = y + lh;
    this._atlas = document.createElement('canvas');
    this._atlas.width = width;
    this._atlas.height = height;
    this.sprites = {};
    for (var name in this.descs) {
      if (! this.descs.hasOwnProperty(name)) continue;
      this._preRender(name);
    }
  },

  /* Pre-render the sprite description as given by name */
  _preRender: function(name) {
    if (! this._sprites[name]) {
      /* Draw background */
      var desc = this.descs[name];
      if (/^#/.test(desc.bg)) {
        this._atlas.fillStyle = desc.bg;
        this._atlas.fillRect(desc._ax, desc._ay, desc.dw, desc.dh);
      } else if (desc.bg) {
        this._sprites[name].render(this._atlas, desc._ax, desc._ay);
      }
      /* Create sprite */
      var sprite = new Sprite(this.image, {x: desc.x, y: desc.y,
        w: desc.w, h: desc.h, dw: desc.dw, dh: desc.dh},
        desc.transform || null);
      sprite.preRender(this._atlas, desc._ax, desc._ay);
      this._sprites[name] = sprite;
    }
    return this._sprites[name];
  }
};
