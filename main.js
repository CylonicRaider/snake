
var HIGHSCORE = null;

function $id(id, parent) {
  return (parent || document).getElementById(id);
}
function $listen(node, event, handler) {
  if (typeof node == "string") node = $id(node);
  node.addEventListener(event, handler);
}

function showNode(node, focus) {
  if (typeof node == "string") node = $id(node);
  if (typeof focus == "string") focus = $id(focus);
  if (! node || ! node.classList.contains("pane")) return;
  var prev = node.previousElementSibling, next = node.nextElementSibling;
  while (prev) {
    prev.classList.remove("visible");
    prev = prev.previousElementSibling;
  }
  while (next) {
    next.classList.remove("visible");
    next = next.nextElementSibling;
  }
  for (var child = node.firstElementChild; child;
       child = child.nextElementSibling) {
    child.classList.remove("visible");
  }
  showNode(node.parentNode);
  node.classList.add("visible");
  if (focus != null) focus.focus();
}

function highscore(newValue) {
  if (window.localStorage) {
    if (HIGHSCORE == null) {
      try {
        var item = localStorage.getItem("snake-highscore");
        if (! item) throw "absent";
        HIGHSCORE = parseInt(item);
        if (! isFinite(HIGHSCORE)) throw "bad number";
      } catch (e) {
        HIGHSCORE = 0;
      }
    }
    if (newValue != null && newValue > HIGHSCORE) {
      HIGHSCORE = newValue;
      localStorage.setItem("snake-highscore", newValue.toString());
    }
  } else {
    if (HIGHSCORE == null) HIGHSCORE = 0;
    if (newValue != null && newValue > HIGHSCORE) HIGHSCORE = newValue;
  }
  return HIGHSCORE;
}

function init() {
  function directSnake(event) {
    if (! game) return;
    var gameRect = game.canvas.getBoundingClientRect();
    // Account for border.
    var ex = event.clientX - gameRect.left - 2;
    var ey = event.clientY - gameRect.top - 2;
    var cx = ex / CELLSIZE, cy = ey / CELLSIZE;
    if (ex < 0 || ey < 0 || cx >= game.size[0] || cy >= game.size[1])
      return;
    game.turnSnakeTo(cx, cy);
  }
  var game;
  $listen("start", "click", function() {
    SPRITESHEET.compose(CELLSIZE * 8);
    game = new Game($id("game"), DEFAULT_SIZE);
    game.onevent = function(event) {
      if (event.type == "status") {
        if (event.status == "banner") {
          $id("level").textContent = event.level;
          $id("level-big").textContent = event.level;
        } else if (event.status == "dead") {
          var explanation = "\u201c" + event.reason + "\u201d";
          $id("death-reason").textContent = explanation;
          $id("death-level").textContent = game.level;
          $id("death-score").textContent = game.score + " / " + highscore();
          if (window.onSnakeEvent)
            window.onSnakeEvent({type: "gameover", game: game,
              score: game.score, level: game.level,
              highscore: HIGHSCORE});
        }
        switch (event.status) {
          case "banner": showNode("levelscreen"); break;
          case "running": showNode("gamescreen", "game"); break;
          case "paused": showNode("pausescreen", "resume"); break;
          case "dead": showNode("overscreen", "restart"); break;
        }
      } else if (event.type == "score") {
        $id("score").textContent = event.value;
        $id("highscore").textContent = highscore(event.value);
      }
    };
    showNode("gamescreen", "game");
    game.init();
    game.loadLevel(1);
    game.main();
  });
  $listen("game", "keydown", function(event) {
    if (! game) return;
    switch (event.keyCode) {
      case 19: game.pause(); break;
      case 27: game.die("player quit"); break;
      case 38: game.turnSnake("U"); break;
      case 39: game.turnSnake("R"); break;
      case 40: game.turnSnake("D"); break;
      case 37: game.turnSnake("L"); break;
    }
  });
  $listen("game", "mousedown", directSnake);
  $listen("game", "touchdown", directSnake);
  $listen("game", "blur", function(event) {
    if (game && game.status == "running") game.pause(true);
  });
  $listen("game", "focus", function(event) {
    if (game && game.status == "paused") game.pause(false);
  });
  $listen("resume", "click", function(event) {
    if (game && game.status == "paused") game.pause(false);
  });
  $listen("restart", "click", function(event) {
    if (game && game.status == "dead") {
      game.init();
      game.loadLevel(1);
      game.main();
    }
  });
  showNode("titlescreen");
  if (! document.activeElement || document.activeElement == document.body)
    $id("start").focus();
}

function windowSize() {
  return [DEFAULT_SIZE[0] * CELLSIZE + 6, DEFAULT_SIZE[1] * CELLSIZE + 30];
}

$listen(window, "load", function() {
  var img = $id("spritesheet");
  if (img.complete) {
    init();
  } else {
    $listen(img, "load", init);
  }
});
