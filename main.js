
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
