/**
 * CogniCare - dragdrop.js
 * Drag-and-drop functionality for Level 7 basket sorting
 */

const DragDrop = (() => {

  let dragging = null;
  let originX = 0, originY = 0;
  let ghostEl = null;

  function init(arena, onDrop) {
    // Touch + Mouse drag
    arena.addEventListener('mousedown', startDrag);
    arena.addEventListener('touchstart', startDragTouch, { passive: true });

    function startDrag(e) {
      const ball = e.target.closest('.ball[draggable]');
      if (!ball) return;
      e.preventDefault();
      dragging = ball;
      originX = ball.style.left;
      originY = ball.style.top;
      setupGhost(ball, e.clientX, e.clientY);
      document.addEventListener('mousemove', moveDrag);
      document.addEventListener('mouseup', endDrag);
    }

    function startDragTouch(e) {
      const ball = e.target.closest('.ball[draggable]');
      if (!ball) return;
      dragging = ball;
      originX = ball.style.left;
      originY = ball.style.top;
      const touch = e.touches[0];
      setupGhost(ball, touch.clientX, touch.clientY);
      document.addEventListener('touchmove', moveDragTouch, { passive: false });
      document.addEventListener('touchend', endDragTouch);
    }

    function setupGhost(ball, cx, cy) {
      ghostEl = ball.cloneNode(true);
      ghostEl.style.position = 'fixed';
      ghostEl.style.opacity = '0.75';
      ghostEl.style.pointerEvents = 'none';
      ghostEl.style.zIndex = '9000';
      ghostEl.style.transition = 'none';
      const rect = ball.getBoundingClientRect();
      ghostEl.style.width  = rect.width  + 'px';
      ghostEl.style.height = rect.height + 'px';
      ghostEl.style.left   = rect.left   + 'px';
      ghostEl.style.top    = rect.top    + 'px';
      document.body.appendChild(ghostEl);
      ball.style.opacity = '0.3';
      moveGhost(cx, cy, rect.width, rect.height);
    }

    function moveGhost(cx, cy, w, h) {
      if (!ghostEl) return;
      ghostEl.style.left = (cx - w/2) + 'px';
      ghostEl.style.top  = (cy - h/2) + 'px';
      highlightBasket(cx, cy);
    }

    function moveDrag(e)      { if (!ghostEl) return; const r = ghostEl ? ghostEl.getBoundingClientRect() : null; moveGhost(e.clientX, e.clientY, parseFloat(ghostEl.style.width), parseFloat(ghostEl.style.height)); }
    function moveDragTouch(e) { e.preventDefault(); if (!ghostEl) return; const t = e.touches[0]; moveGhost(t.clientX, t.clientY, parseFloat(ghostEl.style.width), parseFloat(ghostEl.style.height)); }

    function highlightBasket(cx, cy) {
      document.querySelectorAll('.basket').forEach(b => {
        const r = b.getBoundingClientRect();
        const over = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
        b.classList.toggle('drag-over', over);
      });
    }

    function endDrag(e) {
      finalize(e.clientX, e.clientY);
      document.removeEventListener('mousemove', moveDrag);
      document.removeEventListener('mouseup', endDrag);
    }
    function endDragTouch(e) {
      const t = e.changedTouches[0];
      finalize(t.clientX, t.clientY);
      document.removeEventListener('touchmove', moveDragTouch);
      document.removeEventListener('touchend', endDragTouch);
    }

    function finalize(cx, cy) {
      document.querySelectorAll('.basket').forEach(b => b.classList.remove('drag-over'));
      if (!dragging || !ghostEl) { cleanup(); return; }

      // Find which basket was dropped on
      let droppedBasket = null;
      document.querySelectorAll('.basket').forEach(b => {
        const r = b.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          droppedBasket = b;
        }
      });

      const ball = dragging;
      cleanup();

      if (droppedBasket) {
        onDrop(ball, droppedBasket);
      } else {
        // Return ball
        ball.style.opacity = '1';
      }
    }

    function cleanup() {
      if (ghostEl) { ghostEl.remove(); ghostEl = null; }
      if (dragging) { dragging.style.opacity = '1'; dragging = null; }
    }
  }

  return { init };
})();
