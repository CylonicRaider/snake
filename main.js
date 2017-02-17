
function $id(id, parent) {
  return (parent || document).getElementById(id);
}
function $listen(node, event, handler) {
  if (typeof node == "string") node = $id(node);
  node.addEventListener(event, handler);
}

function showNode(node) {
  if (typeof node == "string") node = $id(node);
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
  node.classList.add("visible");
}

function init() {
  var game;
  $listen("start", "click", function() {
    SPRITESHEET.compose(CELLSIZE * 8);
    game = new Game($id("game"), [20, 15]);
    game.init();
    game._egg = [10, 7];
    game._direction = "R";
    game._grow = 5;
    game._running = true;
    game.render(true);
    showNode("gamescreen");
    game.main();
    $id("game").focus();
  });
  $listen("game", "keydown", function(event) {
    if (! game) return;
    switch (event.keyCode) {
      case 27: game._running = false; break;
      case 38: game.turnSnake("U"); break;
      case 39: game.turnSnake("R"); break;
      case 40: game.turnSnake("D"); break;
      case 37: game.turnSnake("L"); break;
    }
  });
  showNode("titlescreen");
}

$listen(window, "load", function() {
  var img = $id("spritesheet");
  if (img.complete) {
    init();
  } else {
    $listen(img, "load", init);
  }
});
