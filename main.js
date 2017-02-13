
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
  function testSprites(img) {
    var sheet = new SpriteSheet(img, {
      headU: {x: 0, y: 0, w: 16, h: 16, dw: 64, dh: 64},
      headD: {base: "headU", transform: "turn"},
      headL: {base: "headU", transform: "rotCCW"},
      headR: {base: "headU", transform: "rotCW"},
      headMouse: {base: "headU", bg: "mouse"},
      mouse: {x: 32, y: 0, w: 16, h: 16, dw: 64, dh: 64}
    });
    sheet.compose(512);
    $id("gamescreen").appendChild(sheet._atlas);
    showNode("gamescreen");
  }
  $listen("start", "click", function() {
    var img = $id("spritesheet");
    if (img.complete) {
      testSprites(img);
    } else {
      $listen(img, "load", function() {
        testSprites(img);
      });
    }
  });
  showNode("titlescreen");
}

window.addEventListener("load", init);
