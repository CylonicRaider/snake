
var CELLSIZE = 32;

var TURNDIR = {U: "D", D: "U", R: "L", L: "R"};

function rndRange(from, to) {
  return from + (Math.random() * (to + 1 - from) | 0);
}
function rndChoice(array) {
  return array[Math.random() * array.length | 0];
}

function poseq(pos1, pos2) {
  return (pos1[0] == pos2[0] && pos1[1] == pos2[1]);
}

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
  arrowU: {x: 16, y: 16, s: 16, ds: CELLSIZE},
  arrowR: {base: "arrowU", transform: "rotCW"},
  arrowD: {base: "arrowU", transform: "turn"},
  arrowL: {base: "arrowU", transform: "rotCCW"},
  mouse: {x: 32, y: 0, s: 16, ds: CELLSIZE},
  gem: {x: 32, y: 16, s: 16, ds: CELLSIZE},
  potionGreen: {x: 32, y: 32, s: 16, ds: CELLSIZE},
  potionRed: {x: 32, y: 48, s: 16, ds: CELLSIZE},
  obstacle: {x: 16, y: 32, s: 16, ds: CELLSIZE}
}, {bodyDU: "bodyUD", bodyLR: "bodyRL", bodyRU: "bodyUR", bodyDR: "bodyRD",
  bodyLD: "bodyDL", bodyUL: "bodyLU"});

/* The actual game engine
 * canvas is the canvas to render on; size is the board size (in cells). The
 * dimensions of the canvas are set dynamically (in the init() method). */
function Game(canvas, size) {
  this.canvas = canvas;
  this.size = size;
  this.onevent = null;
  this.status = "idle";
  this.score = null;
  this._delayHatch = null;
  this._torusEnd = null;
  this._egg = null;
  this._direction = null;
  this._snake = [];
  this._grow = 0;
  this._obstacles = [];
  this._mouse = null;
  this._gem = null;
  this._greenPotion = null;
  this._redPotion = null;
  this._context = null;
  this._fullRender = false;
  this._clears = [];
  this._redraws = [];
}

Game.prototype = {
  /* Perform general initialization */
  init: function() {
    this.canvas.width = this.size[0] * CELLSIZE;
    this.canvas.height = this.size[1] * CELLSIZE;
    this._context = this.canvas.getContext('2d');
    this._score(0, true);
  },

  /* Load the level with given number */
  loadLevel: function(levnum) {
    this._delayHatch = performance.now() + 2000;
    this._torusEnd = null;
    this._egg = [this.size[0] >> 1, this.size[1] >> 1, null];
    this._direction = rndChoice("URDL");
    this._snake = [];
    this._grow = 5;
    this._obstacles = [];
    this._mouse = null;
    this._gem = null;
    this._greenPotion = null;
    this._redPotion = null;
    var no = (levnum - 1) * 3;
    for (var i = 0; i < no; i++) {
      var pos = this._spawn();
      if (pos != null)
        this._obstacles.push(pos);
    }
  },

  /* Render the game */
  render: function(full) {
    var ctx = this._context;
    if (full || this._fullRender) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this._fullRender = false;
      this._clears = [];
      this._redraws = [];
      for (var i = 0; i < this._obstacles.length; i++) {
        this._markDirty(this._obstacles[i], false, "obstacle");
      }
      if (this._mouse)
        this._markDirty(this._mouse, false, "mouse");
      if (this._gem)
        this._markDirty(this._gem, false, "gem");
      if (this._greenPotion)
        this._markDirty(this._greenPotion, false, "potionGreen");
      if (this._redPotion)
        this._markDirty(this._redPotion, false, "potionRed");
      /* HACK: Avoid drawing single-segment snake */
      if (this._snake.length > 1) {
        for (var i = this._snake.length - 1; i >= 0; i--) {
          this._markDirty(this._snake[i], false, this._snakeSprite(i));
        }
      }
      if (this._egg) {
        this._markDirty(this._egg, false, "egg");
        if (this._snake.length == 0)
          this._markDirty(this._egg, false, "arrow" + this._direction);
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

  /* Schedule a cell to be re-rendered */
  _markDirty: function(cell, clear, draw) {
    if (clear) this._clears.push([cell[0], cell[1]]);
    if (draw) this._redraws.push([cell[0], cell[1], draw]);
  },

  /* Calculate which sprite to use for the given snake segment */
  _snakeSprite: function(idx) {
    var seg = this._snake[idx];
    if (idx == 0) {
      return "head" + seg[2];
    } else if (idx == this._snake.length - 1) {
      return "tail" + seg[2];
    } else {
      return "body" + seg[2] + TURNDIR[this._snake[idx + 1][2]];
    }
  },

  /* Check if the given cell is already occupied by something */
  _freeSpot: function(pos) {
    if (this._egg && poseq(pos, this._egg)) return false;
    if (this._mouse && poseq(pos, this._mouse)) return false;
    if (this._greenPotion && poseq(pos, this._greenPotion)) return false;
    if (this._redPotion && poseq(pos, this._redPotion)) return false;
    if (this._gem && poseq(pos, this._gem)) return false;
    for (var i = 0; i < this._obstacles.length; i++)
      if (poseq(pos, this._obstacles[i])) return false;
    for (var i = 0; i < this._snake.length; i++)
      if (poseq(pos, this._snake[i])) return false;
    return true;
  },

  /* Return the coordinates of a free cell, or null if none found after
   * some tries */
  _spawn: function(item) {
    var tries = 10;
    for (;;) {
      if (tries-- <= 0) return null;
      var pos = [rndRange(0, this.size[0] - 1),
                 rndRange(0, this.size[1] - 1)];
      if (this._freeSpot(pos)) {
        if (item) this._markDirty(pos, false, item);
        return pos;
      }
    }
  },

  /* Update score */
  _score: function(incr, set) {
    var old = this.score;
    if (set) {
      this.score = incr;
    } else {
      this.score += incr;
    }
    if (this.onevent)
      this.onevent({type: "score", old: old, value: this.score});
  },

  /* Update CSS classes of canvas */
  _setCanvasClass: function(cls, value) {
    var classes = this.canvas.classList;
    if (value) {
      if (! classes.contains(cls)) classes.add(cls);
    } else {
      if (classes.contains(cls)) classes.remove(cls);
    }
  },

  /* Update the game state */
  update: function() {
    if (this.status != "running") return;
    var now = performance.now();
    /* Update CSS classes. */
    if (this._torusEnd == null) {
      /* NOP */
    } else if (this._torusEnd < now) {
      this._torusEnd = null;
      this._setCanvasClass("torus", false);
      this._setCanvasClass("soon", false);
    } else if (this._torusEnd - 1000 < now) {
      this._setCanvasClass("torus", true);
      this._setCanvasClass("soon", true);
    } else {
      this._setCanvasClass("torus", true);
      this._setCanvasClass("soon", false);
    }
    /* Update egg arrow. */
    if (this._snake.length == 0 && this._direction != this._egg[2]) {
      this._egg[2] = this._direction;
      this._markDirty(this._egg, true, "egg");
      this._markDirty(this._egg, false, "arrow" + this._direction);
    }
    /* Spawn/move mouse. */
    if (Math.random() < 0.1) {
      if (this._mouse == null) {
        this._mouse = this._spawn("mouse");
      } else {
        var newMouse = [this._mouse[0], this._mouse[1]];
        switch (rndChoice("URDL")) {
          case "U": newMouse[1]--; break;
          case "R": newMouse[0]++; break;
          case "D": newMouse[1]++; break;
          case "L": newMouse[0]--; break;
        }
        if (newMouse[0] < 0 || newMouse[0] >= this.size[0] ||
            newMouse[1] < 0 || newMouse[1] >= this.size[1]) {
          this._markDirty(this._mouse, true);
          this._mouse = null;
        } else if (this._freeSpot(newMouse)) {
          this._markDirty(this._mouse, true);
          this._mouse = newMouse;
          this._markDirty(this._mouse, false, "mouse");
        }
      }
    }
    /* Spawn gem and potions. */
    if (Math.random() < 0.03 && this._gem == null)
      this._gem = this._spawn("gem");
    if (Math.random() < 0.005 && this._greenPotion == null)
      this._greenPotion = this._spawn("potionGreen");
    if (Math.random() < 0.005 && this._redPotion == null)
      this._redPotion = this._spawn("potionRed");
    /* Remove a node. */
    if (this._grow <= 0) {
      if (this._snake.length < 3)
        return this.die("too short");
      /* Remove egg if necessary. */
      if (this._egg) {
        var tail = this._snake[this._snake.length - 1];
        if (poseq(tail, this._egg)) this._egg = null;
      }
      this._markDirty(this._snake.pop(), true);
      var last = this._snake.length - 1;
      this._markDirty(this._snake[last], true, this._snakeSprite(last));
      this._grow++;
    }
    /* Add a new node. */
    if (this._delayHatch != null && now < this._delayHatch) {
      /* NOP */
    } else if (this._grow >= 0) {
      this._delayHatch = null;
      if (this._snake.length == 0) {
        /* Hatching */
        this._snake.push([this._egg[0], this._egg[1], this._direction]);
      } else {
        var newX = this._snake[0][0], newY = this._snake[0][1];
        var t = (this._torusEnd != null);
        switch (this._direction) {
          case "U": if (--newY < 0 && t) newY += this.size[1]; break;
          case "R": if (++newX >= this.size[0] && t) newX = 0; break;
          case "D": if (++newY >= this.size[1] && t) newY = 0; break;
          case "L": if (--newX < 0 && t) newX += this.size[0]; break;
        }
        this._snake[0][2] = this._direction;
        this._snake.splice(0, 0, [newX, newY, this._direction]);
        this._markDirty(this._snake[0], true, this._snakeSprite(0));
        this._markDirty(this._snake[1], true, this._snakeSprite(1));
        if (this._egg && poseq(this._egg, this._snake[1]))
          this._markDirty(this._egg, false, "egg");
        for (var i = 1; i < this._snake.length; i++) {
          if (poseq(this._snake[i], this._snake[0])) {
            return this.die("crashed into self");
          }
        }
        if (newX < 0 || newX >= this.size[0] || newY < 0 ||
            newY >= this.size[1])
          return this.die("crashed into wall");
      }
      this._grow--;
      /* Eat items. */
      var head = this._snake[0];
      for (var i = 0; i < this._obstacles.length; i++) {
        if (poseq(head, this._obstacles[i])) {
          if (this._torusEnd == null)
            return this.die("crashed into obstacle");
          this._obstacles.splice(i, 1);
          this._markDirty(head, true);
          this._score(20);
          break;
        }
      }
      if (this._mouse && poseq(this._mouse, head)) {
        this._markDirty(head, true);
        this._mouse = null;
        this._grow += 5;
        this._score(5);
      } else if (this._gem && poseq(this._gem, head)) {
        this._markDirty(head, true);
        this._gem = null;
        this._grow -= 5;
        this._score(10);
      } else if (this._greenPotion && poseq(this._greenPotion, head)) {
        this._markDirty(head, true);
        this._greenPotion = null;
        this._torusEnd = now + 10000;
        this._score(50);
      } else if (this._redPotion && poseq(this._redPotion, head)) {
        this._markDirty(head, true);
        this._redPotion = null;
        this._score((this._snake.length + this._grow) * 2);
        this._grow = 5 - this._snake.length;
      }
    }
  },

  /* Main game loop */
  main: function() {
    this.status = "running";
    if (this.onevent)
      this.onevent({type: "status", status: "running", reason: "started"});
    this.render(true);
    var int = setInterval(function() {
      this.update();
      this.render();
      if (this.status != "running" && this.status != "paused")
        clearInterval(int);
    }.bind(this), 100);
  },

  /* Controls */
  turnSnake: function(dir) {
    if (! TURNDIR.hasOwnProperty(dir)) return;
    if (this._snake.length && dir == TURNDIR[this._snake[0][2]]) return;
    this._direction = dir;
  },

  /* Pause or unpause game */
  pause: function(state) {
    if (state == null) state = (this.status != "paused");
    if (state) {
      this.status = "paused";
    } else {
      this.status = "running";
    }
    if (this.onevent)
      this.onevent({type: "status", status: this.status, reason: "pause"});
  },

  /* Stop the game */
  die: function(reason) {
    this.status = "dead";
    this.canvas.classList.remove("torus");
    this.canvas.classList.remove("soon");
    this._fullRender = true;
    if (this.onevent)
      this.onevent({type: "status", status: "dead", reason: reason});
  }
};
