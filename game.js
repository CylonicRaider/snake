
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
