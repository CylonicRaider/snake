
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
  showNode(node.parentNode);
  for (var child = node.firstElementChild; child;
       child = child.nextElementSibling) {
    child.classList.remove("visible");
  }
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
  var game;
  $listen("start", "click", function() {
    SPRITESHEET.compose(CELLSIZE * 8);
    game = new Game($id("game"), [20, 15]);
    game.onevent = function(event) {
      if (event.type == "status") {
        if (event.status == "dead") {
          var explanation = "\u201c" + event.reason + "\u201d";
          $id("death-reason").textContent = explanation;
          $id("death-score").textContent = game.score + " / " + highscore();
        }
        switch (event.status) {
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
      case 27: game.die("player quit"); break;
      case 38: game.turnSnake("U"); break;
      case 39: game.turnSnake("R"); break;
      case 40: game.turnSnake("D"); break;
      case 37: game.turnSnake("L"); break;
    }
  });
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

$listen(window, "load", function() {
  var img = $id("spritesheet");
  if (img.complete) {
    init();
  } else {
    $listen(img, "load", init);
  }
});
