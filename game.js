
var CELLSIZE = 32;

var TURNDIR = {U: "D", D: "U", R: "L", L: "R"};

/* Encapsulating a section of a texture atlas along with pre-rendering
 * image    : The texture atlas.
 * selection: An {x, y, s, ds} object denoting the section of the texture
 *            atlas to use and how to display it. x, y, and s select a
 *            rectangular part (of size s*s) of the source image; ds contains
 *            a size to scale the image to. ds defaults to s; all other
 *            members must be present.
 * transform: Currently, null (for none) or one of the following keywords:
 *            rotCW : Rotate clockwise by ninety degrees.
 *            rotCCW: Rotate counterclockwise by ninety degrees.
 *            turn  : Rotate by 180 degrees. */
function Sprite(image, selection, transform) {
  if (selection.ds == null) selection.ds = selection.s;
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
      drain.drawImage(im, sel.x, sel.y, sel.s, sel.s, x, y, sel.ds, sel.ds);
    } else {
      var im = this.image, sel = this.selection, tr = this.transform;
      drain.save();
      drain.translate(x, y);
      switch (tr) {
        case "rotCW": drain.transform(0, 1, -1, 0, sel.ds, 0); break;
        case "rotCCW": drain.transform(0, -1, 1, 0, 0, sel.ds); break;
        case "turn": drain.transform(-1, 0, 0, -1, sel.ds, sel.ds); break;
      }
      drain.drawImage(im, sel.x, sel.y, sel.s, sel.s, 0, 0, sel.ds, sel.ds);
      drain.restore();
    }
  },

  /* Pre-render the sprite into the given atlas
   * If atlas is null, the current prerendering is cleared (as it is in
   * any case), and no new one is created. */
  preRender: function(atlas, ctx, x, y) {
    this._atlas = null;
    this._atlasSelection = null;
    if (atlas != null) {
      this.render(ctx, x, y);
      this._atlas = atlas;
      var sel = this.selection;
      this._atlasSelection = {x: x, y: y, s: sel.ds, ds: sel.ds};
    }
  }
};

/* Wrapper around a collection of prerendered Sprite-s
 * image:   The spritesheet common to the sprites
 * descs:   Object mapping sprite names to objects sharing the format with
 *          Sprite.selection, with the "transform" attribute stored as an
 *          additional property, if any. The "bg" property can be either a
 *          color (starting with a '#' sign) or a sprite name, which is
 *          used as the background for the sprite (for precompositing).
 *          A "base" property names a description to clone absent properties
 *          from (should not be nested).
 * aliases: An object whose pairs represent alternate names for the same
 *          sprite (key: "new" name, value: "base" name).
 * Attributes:
 * sprites: Actual sprite storage. Computed by the compose() method.
 */
function SpriteSheet(image, descs, aliases) {
  this.image = image;
  this.descs = descs;
  this.aliases = aliases;
  this._atlas = null;
  this.sprites = null;
}

SpriteSheet.prototype = {
  /* Compose the spritesheet */
  compose: function(width) {
    /* Arbitrarily choosing the spritesheet's width.
     * Box packing problems are already hard without that. */
    var width = width || this.image.width;
    var x = 0, y = 0, l = 0, lh = 0;
    for (var name in this.descs) {
      if (! this.descs.hasOwnProperty(name)) continue;
      var desc = this.descs[name];
      if (desc.base) {
        var base = this.descs[desc.base];
        if (desc.x == null) desc.x = base.x;
        if (desc.y == null) desc.y = base.y;
        if (desc.s == null) desc.s = base.s;
        if (desc.ds == null) desc.ds = base.ds;
        if (desc.bg == null) desc.bg = base.bg;
      }
      if (desc.ds == null) desc.ds = desc.s;
      /* Check if it fits */
      if (x + desc.ds > width) {
        x = 0;
        y += lh;
        l++;
        lh = 0;
      }
      desc._ax = x;
      desc._ay = y;
      x += desc.ds;
      if (lh < desc.ds) lh = desc.ds;
    }
    var height = y + lh;
    this._atlas = document.createElement('canvas');
    this._atlas.width = width;
    this._atlas.height = height;
    var ctx = this._atlas.getContext('2d');
    this.sprites = {};
    for (var name in this.descs) {
      if (! this.descs.hasOwnProperty(name)) continue;
      this._preRender(name, ctx);
    }
    for (var name in this.aliases) {
      if (! this.aliases.hasOwnProperty(name)) continue;
      this.sprites[name] = this.sprites[this.aliases[name]];
    }
  },

  /* Pre-render the sprite description as given by name */
  _preRender: function(name, ctx) {
    if (! this.sprites[name]) {
      /* Draw background */
      var desc = this.descs[name];
      if (/^#/.test(desc.bg)) {
        ctx.fillStyle = desc.bg;
        ctx.fillRect(desc._ax, desc._ay, desc.ds, desc.ds);
      } else if (desc.bg) {
        this._preRender(desc.bg, ctx).render(ctx, desc._ax, desc._ay);
      }
      /* Create sprite */
      var sprite = new Sprite(this.image, {x: desc.x, y: desc.y, s: desc.s,
        ds: desc.ds}, desc.transform || null);
      sprite.preRender(this._atlas, ctx, desc._ax, desc._ay);
      this.sprites[name] = sprite;
    }
    return this.sprites[name];
  }
};

var SPRITESHEET = new SpriteSheet($id("spritesheet"), {
  headU: {x: 0, y: 0, s: 16, ds: CELLSIZE},
  headR: {base: "headU", transform: "rotCW"},
  headD: {base: "headU", transform: "turn"},
  headL: {base: "headU", transform: "rotCCW"},
  bodyUD: {x: 0, y: 16, s: 16, ds: CELLSIZE},
  bodyRL: {base: "bodyUD", transform: "rotCW"},
  bodyUR: {x: 0, y: 32, s: 16, ds: CELLSIZE},
  bodyRD: {base: "bodyUR", transform: "rotCW"},
  bodyDL: {base: "bodyUR", transform: "turn"},
  bodyLU: {base: "bodyUR", transform: "rotCCW"},
  tailU: {x: 0, y: 48, s: 16, ds: CELLSIZE},
  tailR: {base: "tailU", transform: "rotCW"},
  tailD: {base: "tailU", transform: "turn"},
  tailL: {base: "tailU", transform: "rotCCW"},
  egg: {x: 16, y: 0, s: 16, ds: CELLSIZE},
  arrowU: {x: 16, y: 32, s: 16, ds: CELLSIZE},
  arrowR: {base: "arrowU", transform: "rotCW"},
  arrowD: {base: "arrowU", transform: "turn"},
  arrowL: {base: "arrowU", transform: "rotCCW"}
}, {bodyDU: "bodyUD", bodyLR: "bodyRL", bodyRU: "bodyUR", bodyDR: "bodyRD",
  bodyLD: "bodyDL", bodyUL: "bodyLU"});

/* The actual game engine
 * canvas is the canvas to render on; size is the board size (in cells). The
 * dimensions of the canvas are set dynamically (in the init() method). */
function Game(canvas, size) {
  this.canvas = canvas;
  this.size = size;
  this._context = null;
  this._egg = null;
  this._direction = null;
  this._snake = [];
  this._grow = 0;
  this._clears = [];
  this._redraws = [];
  this._running = false;
}

Game.prototype = {
  /* Perform general initialization */
  init: function() {
    this.canvas.width = this.size[0] * CELLSIZE;
    this.canvas.height = this.size[1] * CELLSIZE;
    this._context = this.canvas.getContext('2d');
  },

  /* Render the game */
  render: function(full) {
    var ctx = this._context;
    if (full) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this._clears = [];
      this._redraws = [];
      var snake = this._snake, length = this._snake.length - 1;
      /* HACK: Avoid drawing single-segment snake */
      if (length > 0) {
        for (var i = 0; i <= length; i++) {
          var seg = snake[i];
          if (i == 0) {
            this._redraws.push([seg[0], seg[1], "head" + seg[2]]);
          } else if (i == length) {
            this._redraws.push([seg[0], seg[1], "tail" + seg[2]]);
          } else {
            this._redraws.push([seg[0], seg[1],
              "body" + seg[2] + TURNDIR[snake[i + 1][2]]]);
          }
        }
      }
      if (this._egg) {
        this._redraws.push([this._egg[0], this._egg[1], "egg"]);
        if (this._snake.length == 0)
          this._redraws.push([this._egg[0], this._egg[1],
                             "arrow" + this._direction]);
      }
    }
    if (this._clears.length) {
      var queue = this._clears;
      this._clears = [];
      for (var i = 0; i < queue.length; i++) {
        var it = queue[i];
        ctx.clearRect(it[0] * CELLSIZE, it[1] * CELLSIZE,
                      CELLSIZE, CELLSIZE);
      }
    }
    if (this._redraws.length) {
      var queue = this._redraws, sprites = SPRITESHEET.sprites;
      this._redraws = [];
      for (var i = 0; i < queue.length; i++) {
        var it = queue[i];
        sprites[it[2]].render(ctx, it[0] * CELLSIZE, it[1] * CELLSIZE);
      }
    }
  },

  /* Update the game state */
  update: function() {
    if (! this._running) return;
    /* Remove a node. */
    if (this._grow <= 0) {
      if (this._snake.length <= 3) {
        this._running = false;
        return;
      }
      /* Remove egg if necessary */
      if (this._egg) {
        var tail = this._snake[this._snake.length - 1];
        if (tail[0] == this._egg[0] && tail[1] == this._egg[1]) {
          this._egg = null;
        }
      }
      this._snake.pop();
      this._grow++;
    }
    /* Add a new node. */
    if (this._grow >= 0) {
      if (this._snake.length == 0) {
        /* Hatching */
        this._snake.push([this._egg[0], this._egg[1], this._direction]);
      } else {
        var newX = this._snake[0][0], newY = this._snake[0][1];
        switch (this._direction) {
          case "U": newY--; if (newY < 0) newY += this.size[1]; break;
          case "R": newX++; if (newX >= this.size[0]) newX = 0; break;
          case "D": newY++; if (newY >= this.size[1]) newY = 0; break;
          case "L": newX--; if (newX < 0) newX += this.size[0]; break;
        }
        this._snake[0][2] = this._direction;
        this._snake.splice(0, 0, [newX, newY, this._direction]);
      }
      this._grow--;
    }
  },

  /* Main game loop */
  main: function() {
    var int = setInterval(function() {
      this.update();
      this.render(true);
      if (! this._running) clearInterval(int);
    }.bind(this), 100);
  }
};
