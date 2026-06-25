(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "tableset.meeting.layout.v3";
  const DRAFT_PLACEHOLDER = "assets/draft-placeholder.svg";
  const WORKSPACE = { width: 1600, height: 1000 };
  const PALETTE = [
    "#f2c46f",
    "#7ab0a5",
    "#e9896a",
    "#8ebd6b",
    "#8da6d9",
    "#c39bd3",
    "#e1a85b",
    "#78a1bb",
    "#d77b91",
    "#a5b56d"
  ];

  const els = {
    stage: document.querySelector("#stage"),
    referenceLayer: document.querySelector("#referenceLayer"),
    itemsLayer: document.querySelector("#itemsLayer"),
    draftLayer: document.querySelector("#draftLayer"),
    statusLine: document.querySelector("#statusLine"),
    roomNameInput: document.querySelector("#roomNameInput"),
    canvasTitle: document.querySelector("#canvasTitle"),
    selectionHint: document.querySelector("#selectionHint"),
    toolGrid: document.querySelector("#toolGrid"),
    undoBtn: document.querySelector("#undoBtn"),
    redoBtn: document.querySelector("#redoBtn"),
    saveBtn: document.querySelector("#saveBtn"),
    exportPngBtn: document.querySelector("#exportPngBtn"),
    exportJsonBtn: document.querySelector("#exportJsonBtn"),
    importJsonBtn: document.querySelector("#importJsonBtn"),
    clearLayoutBtn: document.querySelector("#clearLayoutBtn"),
    projectFile: document.querySelector("#projectFile"),
    draftImportBtn: document.querySelector("#draftImportBtn"),
    draftAutoBtn: document.querySelector("#draftAutoBtn"),
    draftClearBtn: document.querySelector("#draftClearBtn"),
    draftFile: document.querySelector("#draftFile"),
    zoomOutBtn: document.querySelector("#zoomOutBtn"),
    fitBtn: document.querySelector("#fitBtn"),
    zoomInBtn: document.querySelector("#zoomInBtn"),
    snapToggle: document.querySelector("#snapToggle"),
    referenceToggle: document.querySelector("#referenceToggle"),
    referenceSection: document.querySelector("#referenceSection"),
    referenceImage: document.querySelector("#referenceImage"),
    referencePreviewBtn: document.querySelector("#referencePreviewBtn"),
    draftViewer: document.querySelector("#draftViewer"),
    draftViewerTitle: document.querySelector("#draftViewerTitle"),
    draftViewerStage: document.querySelector("#draftViewerStage"),
    draftViewerImage: document.querySelector("#draftViewerImage"),
    draftViewerZoomOut: document.querySelector("#draftViewerZoomOut"),
    draftViewerReset: document.querySelector("#draftViewerReset"),
    draftViewerZoomIn: document.querySelector("#draftViewerZoomIn"),
    draftViewerClose: document.querySelector("#draftViewerClose"),
    selectAllBtn: document.querySelector("#selectAllBtn"),
    rotateLeftBtn: document.querySelector("#rotateLeftBtn"),
    rotateRightBtn: document.querySelector("#rotateRightBtn"),
    groupBtn: document.querySelector("#groupBtn"),
    ungroupBtn: document.querySelector("#ungroupBtn"),
    duplicateBtn: document.querySelector("#duplicateBtn"),
    deleteBtn: document.querySelector("#deleteBtn"),
    peopleInput: document.querySelector("#peopleInput"),
    loadPeopleBtn: document.querySelector("#loadPeopleBtn"),
    peopleFileBtn: document.querySelector("#peopleFileBtn"),
    peopleFile: document.querySelector("#peopleFile"),
    personSearch: document.querySelector("#personSearch"),
    autoAssignBtn: document.querySelector("#autoAssignBtn"),
    clearAssignBtn: document.querySelector("#clearAssignBtn"),
    clearPeopleBtn: document.querySelector("#clearPeopleBtn"),
    peopleList: document.querySelector("#peopleList"),
    rosterCount: document.querySelector("#rosterCount"),
    inspector: document.querySelector("#inspector")
  };

  let state = loadState() || createInitialState();
  let currentTool = "select";
  let action = null;
  let draft = null;
  let history = [];
  let redoStack = [];
  let saveTimer = null;
  let draftViewer = { scale: 1, x: 0, y: 0, drag: null };

  normalizeState();
  bindEvents();
  renderAll();
  saveLocal();

  function createInitialState() {
    const initial = createEmptyState();
    return initial;
  }

  function createEmptyState() {
    return {
      version: 1,
      title: "未命名会议室",
      items: [],
      people: [],
      selectedId: null,
      selectedIds: [],
      draftImage: null,
      view: { x: 0, y: 0, w: WORKSPACE.width, h: WORKSPACE.height },
      settings: { snap: true, showReference: false }
    };
  }

  function bindEvents() {
    els.toolGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tool]");
      if (!button) return;
      setTool(button.dataset.tool);
    });

    els.stage.addEventListener("pointerdown", onPointerDown);
    els.stage.addEventListener("pointermove", onPointerMove);
    els.stage.addEventListener("pointerup", onPointerUp);
    els.stage.addEventListener("pointercancel", onPointerUp);
    els.stage.addEventListener("wheel", onWheel, { passive: false });
    els.stage.addEventListener("dragover", onStageDragOver);
    els.stage.addEventListener("drop", onStageDrop);

    els.undoBtn.addEventListener("click", undo);
    els.redoBtn.addEventListener("click", redo);
    els.saveBtn.addEventListener("click", () => {
      saveLocal();
      pulseButton(els.saveBtn, "已保存", "保存");
    });

    els.exportPngBtn.addEventListener("click", exportPng);
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.importJsonBtn.addEventListener("click", () => els.projectFile.click());
    els.clearLayoutBtn.addEventListener("click", clearLayout);
    els.projectFile.addEventListener("change", importProjectFile);
    els.roomNameInput.addEventListener("input", () => {
      state.title = els.roomNameInput.value.trim() || "未命名会议室";
      renderStatus();
      scheduleSave();
    });

    els.draftImportBtn.addEventListener("click", () => els.draftFile.click());
    els.draftFile.addEventListener("change", importDraftFile);
    els.draftAutoBtn.addEventListener("click", autoLayoutFromDraft);
    els.draftClearBtn.addEventListener("click", clearDraftImage);

    els.zoomOutBtn.addEventListener("click", () => zoomAtCenter(1.22));
    els.fitBtn.addEventListener("click", fitView);
    els.zoomInBtn.addEventListener("click", () => zoomAtCenter(0.82));

    els.snapToggle.addEventListener("change", () => {
      state.settings.snap = els.snapToggle.checked;
      scheduleSave();
    });
    els.referenceToggle.addEventListener("change", () => {
      state.settings.showReference = els.referenceToggle.checked;
      renderReference();
      scheduleSave();
    });
    els.referencePreviewBtn.addEventListener("click", openDraftViewer);
    els.draftViewerClose.addEventListener("click", closeDraftViewer);
    els.draftViewerZoomOut.addEventListener("click", () => zoomDraftViewer(0.82));
    els.draftViewerZoomIn.addEventListener("click", () => zoomDraftViewer(1.22));
    els.draftViewerReset.addEventListener("click", resetDraftViewer);
    els.draftViewerStage.addEventListener("pointerdown", onDraftViewerPointerDown);
    els.draftViewerStage.addEventListener("pointermove", onDraftViewerPointerMove);
    els.draftViewerStage.addEventListener("pointerup", onDraftViewerPointerUp);
    els.draftViewerStage.addEventListener("pointercancel", onDraftViewerPointerUp);
    els.draftViewerStage.addEventListener("wheel", onDraftViewerWheel, { passive: false });

    els.selectAllBtn.addEventListener("click", selectAllItems);
    els.rotateLeftBtn.addEventListener("click", () => rotateSelectionBy(-15));
    els.rotateRightBtn.addEventListener("click", () => rotateSelectionBy(15));
    els.groupBtn.addEventListener("click", groupSelected);
    els.ungroupBtn.addEventListener("click", ungroupSelected);
    els.duplicateBtn.addEventListener("click", duplicateSelected);
    els.deleteBtn.addEventListener("click", deleteSelected);

    els.loadPeopleBtn.addEventListener("click", loadPeopleFromTextarea);
    els.peopleFileBtn.addEventListener("click", () => els.peopleFile.click());
    els.peopleFile.addEventListener("change", importPeopleFile);
    els.personSearch.addEventListener("input", renderPeople);
    els.autoAssignBtn.addEventListener("click", autoAssign);
    els.clearAssignBtn.addEventListener("click", clearAssignments);
    els.clearPeopleBtn.addEventListener("click", clearPeople);
    els.peopleList.addEventListener("dragstart", onPersonDragStart);
    els.peopleList.addEventListener("click", onPeopleListClick);

    document.addEventListener("keydown", onKeyDown);
  }

  function setTool(tool) {
    currentTool = tool;
    draft = null;
    action = null;
    els.toolGrid.querySelectorAll(".tool-btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tool === tool);
    });
    renderDraft();
    renderStatus();
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    const point = svgPoint(event);
    const resizeHandle = event.target.closest("[data-resize]");
    const rotateHandle = event.target.closest("[data-rotate]");
    const itemNode = event.target.closest("[data-id]");

    if (resizeHandle) {
      const item = getItem(resizeHandle.dataset.id);
      if (!item) return;
      commitHistory();
      setSelection([item.id]);
      action = {
        type: "resize",
        id: item.id,
        handle: resizeHandle.dataset.resize,
        start: point,
        origin: cloneItem(item),
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderAll();
      return;
    }

    if (rotateHandle || (itemNode && currentTool === "rotate")) {
      const id = rotateHandle ? rotateHandle.dataset.id : itemNode.dataset.id;
      const item = getItem(id);
      if (!item) return;
      if (!isSelected(item.id)) setSelection(idsForItemSelection(item));
      const ids = getSelectedIds();
      const center = selectionCenter(ids);
      commitHistory();
      action = {
        type: "rotate",
        ids,
        center,
        startAngle: angleFromCenter(center, point),
        origins: ids.map((selectedId) => cloneItem(getItem(selectedId))).filter(Boolean),
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderAll();
      return;
    }

    if (currentTool === "pan" || event.button === 1) {
      action = {
        type: "pan",
        startClient: { x: event.clientX, y: event.clientY },
        view: { ...state.view },
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      return;
    }

    if (itemNode && currentTool === "select") {
      const item = getItem(itemNode.dataset.id);
      if (!item) return;
      if (event.ctrlKey || event.metaKey) {
        if (!isSelected(item.id)) setSelection(idsForItemSelection(item));
        action = {
          type: "copyMaybe",
          start: point,
          ids: getSelectedIds(),
          origins: getSelectedIds().map((selectedId) => cloneItem(getItem(selectedId))).filter(Boolean),
          pointerId: event.pointerId
        };
        els.stage.setPointerCapture(event.pointerId);
        renderAll();
        return;
      }
      if (!isSelected(item.id)) setSelection(idsForItemSelection(item));
      const ids = getSelectedIds();
      commitHistory();
      action = {
        type: "drag",
        ids,
        start: point,
        origins: ids.map((selectedId) => cloneItem(getItem(selectedId))).filter(Boolean),
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderAll();
      return;
    }

    if (itemNode && currentTool === "marquee") {
      const item = getItem(itemNode.dataset.id);
      if (!item) return;
      if (event.ctrlKey || event.metaKey) toggleSelectionGroup(item);
      else setSelection(idsForItemSelection(item));
      renderAll();
      scheduleSave();
      return;
    }

    if (itemNode && isSelected(itemNode.dataset.id) && !["table", "seat", "label"].includes(currentTool) && !currentTool.startsWith("shape-")) {
      const ids = getSelectedIds();
      commitHistory();
      action = {
        type: "drag",
        ids,
        start: point,
        origins: ids.map((selectedId) => cloneItem(getItem(selectedId))).filter(Boolean),
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderAll();
      return;
    }

    if (itemNode && currentTool !== "select") {
      const item = getItem(itemNode.dataset.id);
      setSelection(item ? idsForItemSelection(item) : [itemNode.dataset.id]);
      renderAll();
      return;
    }

    if (currentTool === "table" || currentTool.startsWith("shape-")) {
      const kind = currentTool === "table" ? "table" : currentTool.replace("shape-", "");
      draft = { type: "draw", kind, x: point.x, y: point.y, w: 0, h: 0 };
      action = {
        type: "draw",
        kind,
        start: point,
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderDraft();
      return;
    }

    if (currentTool === "seat") {
      commitHistory();
      const seat = createSeat(point.x - 43, point.y - 24, nextSeatLabel(), 0);
      orientSeatTowardNearestTable(seat);
      state.items.push(seat);
      setSelection([seat.id]);
      renderAll();
      scheduleSave();
      return;
    }

    if (currentTool === "label") {
      const text = window.prompt("文字", "标注");
      if (!text) return;
      commitHistory();
      const label = createLabel(point.x, point.y, text);
      state.items.push(label);
      setSelection([label.id]);
      renderAll();
      scheduleSave();
      return;
    }

    if (currentTool === "select" || currentTool === "marquee") {
      draft = { type: "marquee", x: point.x, y: point.y, w: 0, h: 0 };
      action = {
        type: "marquee",
        start: point,
        append: event.ctrlKey || event.metaKey,
        pointerId: event.pointerId
      };
      els.stage.setPointerCapture(event.pointerId);
      renderDraft();
      return;
    }

    clearSelection();
    renderAll();
  }

  function onPointerMove(event) {
    if (!action) return;

    if (action.type === "pan") {
      const rect = els.stage.getBoundingClientRect();
      const dx = ((event.clientX - action.startClient.x) * action.view.w) / rect.width;
      const dy = ((event.clientY - action.startClient.y) * action.view.h) / rect.height;
      state.view.x = action.view.x - dx;
      state.view.y = action.view.y - dy;
      setViewBox();
      return;
    }

    const point = svgPoint(event);

    if (action.type === "draw") {
      const rect = drawRectFromPoints(action.start, point, event.shiftKey, action.kind);
      draft = { type: "draw", kind: action.kind, ...rect };
      renderDraft();
      return;
    }

    if (action.type === "drag") {
      const dx = point.x - action.start.x;
      const dy = point.y - action.start.y;
      action.origins.forEach((origin) => {
        const item = getItem(origin.id);
        if (!item) return;
        item.x = origin.x + dx;
        item.y = origin.y + dy;
        if (state.settings.snap) {
          item.x = snap(item.x);
          item.y = snap(item.y);
        }
      });
      renderStage();
      renderStatus();
      return;
    }

    if (action.type === "copyMaybe") {
      const dx = point.x - action.start.x;
      const dy = point.y - action.start.y;
      if (Math.hypot(dx, dy) < 8) return;
      commitHistory();
      const copies = cloneSelectedItemsForDrag(action.origins);
      if (!copies.length) return;
      state.items.push(...copies);
      setSelection(copies.map((copy) => copy.id));
      action = {
        ...action,
        type: "drag",
        ids: copies.map((copy) => copy.id),
        origins: copies.map(cloneItem)
      };
      action.origins.forEach((origin) => {
        const item = getItem(origin.id);
        if (!item) return;
        item.x = origin.x + dx;
        item.y = origin.y + dy;
        if (state.settings.snap) {
          item.x = snap(item.x);
          item.y = snap(item.y);
        }
      });
      renderStage();
      renderStatus();
      return;
    }

    if (action.type === "rotate") {
      const delta = angleFromCenter(action.center, point) - action.startAngle;
      rotateItems(action, delta);
      renderStage();
      renderStatus();
      return;
    }

    if (action.type === "marquee") {
      const rect = normalizedRect(action.start.x, action.start.y, point.x - action.start.x, point.y - action.start.y);
      draft = { type: "marquee", ...rect };
      renderDraft();
      return;
    }

    if (action.type === "resize") {
      const item = getItem(action.id);
      if (!item) return;
      resizeItem(item, action, point);
      renderStage();
      renderStatus();
    }
  }

  function onPointerUp(event) {
    if (!action) return;

    if (action.type === "draw" && draft) {
      const minSize = 22;
      commitHistory();
      let item;
      if (Math.abs(draft.w) < minSize || Math.abs(draft.h) < minSize) {
        item = draft.kind === "table"
          ? createTable(draft.x - 110, draft.y - 45, 220, 90)
          : createShape(draft.x - 60, draft.y - 40, 120, 80, draft.kind);
      } else {
        item = draft.kind === "table"
          ? createTable(draft.x, draft.y, draft.w, draft.h)
          : createShape(draft.x, draft.y, draft.w, draft.h, draft.kind);
      }
      state.items.push(item);
      setSelection([item.id]);
      draft = null;
      renderAll();
      scheduleSave();
    } else if (action.type === "marquee" && draft) {
      const rect = { ...draft };
      if (rect.w < 6 && rect.h < 6) {
        if (!action.append) clearSelection();
      } else {
        selectItemsInRect(rect, action.append);
      }
      draft = null;
      renderAll();
      scheduleSave();
    } else if (action.type === "copyMaybe") {
      action.origins.forEach((origin) => {
        const item = getItem(origin.id);
        if (item) toggleSelectionGroup(item);
      });
      renderAll();
      scheduleSave();
    } else if (action.type === "drag" || action.type === "resize" || action.type === "rotate" || action.type === "pan") {
      if (action.type === "drag" || action.type === "resize" || action.type === "rotate") normalizeState();
      renderAll();
      scheduleSave();
    }

    try {
      els.stage.releasePointerCapture(action.pointerId || event.pointerId);
    } catch (error) {
      // The pointer may already be released by the browser.
    }
    action = null;
  }

  function onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.9 : 1.1;
    zoomAtPoint(svgPoint(event), factor);
  }

  function resizeItem(item, activeAction, point) {
    const dx = point.x - activeAction.start.x;
    const dy = point.y - activeAction.start.y;
    const origin = activeAction.origin;
    let x = origin.x;
    let y = origin.y;
    let w = origin.w;
    let h = origin.h;

    if (activeAction.handle.includes("e")) w = origin.w + dx;
    if (activeAction.handle.includes("s")) h = origin.h + dy;
    if (activeAction.handle.includes("w")) {
      x = origin.x + dx;
      w = origin.w - dx;
    }
    if (activeAction.handle.includes("n")) {
      y = origin.y + dy;
      h = origin.h - dy;
    }

    item.x = state.settings.snap ? snap(x) : x;
    item.y = state.settings.snap ? snap(y) : y;
    item.w = Math.max(item.type === "label" ? 20 : 30, state.settings.snap ? snap(w) : w);
    item.h = Math.max(item.type === "label" ? 14 : 24, state.settings.snap ? snap(h) : h);
    if (item.type === "label") {
      const scale = Math.max(item.w / Math.max(1, origin.w || item.w), item.h / Math.max(1, origin.h || item.h));
      item.size = clamp((origin.size || 24) * scale, 8, 96);
    }
  }

  function orientSeatTowardNearestTable(seat) {
    const table = nearestTableForSeat(seat);
    if (!table) return;
    const seatCenter = itemCenter(seat);
    const tableCenter = itemCenter(table);
    const dx = seatCenter.x - tableCenter.x;
    const dy = seatCenter.y - tableCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      seat.rotation = dx < 0 ? 90 : -90;
    } else {
      seat.rotation = dy < 0 ? 180 : 0;
    }
  }

  function nearestTableForSeat(seat) {
    const tables = state.items.filter((item) => item.type === "table");
    if (!tables.length) return null;
    const center = itemCenter(seat);
    return tables
      .map((table) => {
        const tableCenter = itemCenter(table);
        const distance = Math.hypot(center.x - tableCenter.x, center.y - tableCenter.y);
        const overlapPenalty = rectsIntersect(boundsForItem(seat), boundsForItem(table)) ? -10000 : 0;
        return { table, score: distance + overlapPenalty };
      })
      .sort((a, b) => a.score - b.score)[0].table;
  }

  function selectItemsInRect(rect, append) {
    const matches = state.items
      .filter((item) => rectsIntersect(rect, boundsForItem(item)))
      .map((item) => item.id);
    setSelection(append ? [...getSelectedIds(), ...matches] : matches);
  }

  function rotateItems(activeAction, deltaRadians) {
    const deltaDegrees = (deltaRadians * 180) / Math.PI;
    activeAction.origins.forEach((origin) => {
      const item = getItem(origin.id);
      if (!item) return;
      const center = itemCenter(origin);
      const rotated = rotatePoint(center, activeAction.center, deltaRadians);
      const size = itemSize(origin);
      item.x = rotated.x - size.w / 2;
      item.y = rotated.y - size.h / 2;
      item.rotation = normalizeAngle((origin.rotation || 0) + deltaDegrees);
      if (state.settings.snap && activeAction.ids.length > 1) {
        item.x = snap(item.x);
        item.y = snap(item.y);
      }
    });
  }

  function alignSelected(kind) {
    const items = getSelectedItems();
    if (items.length < 2) return;
    commitHistory();
    const bounds = boundsForItems(items);
    items.forEach((item) => {
      const itemBounds = boundsForItem(item);
      if (kind === "left") item.x += bounds.x - itemBounds.x;
      if (kind === "right") item.x += bounds.x + bounds.w - (itemBounds.x + itemBounds.w);
      if (kind === "center") item.x += bounds.x + bounds.w / 2 - (itemBounds.x + itemBounds.w / 2);
      if (kind === "top") item.y += bounds.y - itemBounds.y;
      if (kind === "bottom") item.y += bounds.y + bounds.h - (itemBounds.y + itemBounds.h);
      if (kind === "middle") item.y += bounds.y + bounds.h / 2 - (itemBounds.y + itemBounds.h / 2);
      if (state.settings.snap) {
        item.x = snap(item.x);
        item.y = snap(item.y);
      }
    });
    renderAll();
    scheduleSave();
  }

  function selectionCenter(ids) {
    const items = ids.map(getItem).filter(Boolean);
    const bounds = boundsForItems(items);
    return {
      x: bounds.x + bounds.w / 2,
      y: bounds.y + bounds.h / 2
    };
  }

  function angleFromCenter(center, point) {
    return Math.atan2(point.y - center.y, point.x - center.x);
  }

  function boundsForItems(items) {
    if (!items.length) return { x: 0, y: 0, w: 0, h: 0 };
    const bounds = items.map(boundsForItem);
    const minX = Math.min(...bounds.map((bound) => bound.x));
    const minY = Math.min(...bounds.map((bound) => bound.y));
    const maxX = Math.max(...bounds.map((bound) => bound.x + bound.w));
    const maxY = Math.max(...bounds.map((bound) => bound.y + bound.h));
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function boundsForItem(item) {
    const size = itemSize(item);
    return { x: item.x, y: item.y, w: size.w, h: size.h };
  }

  function itemCenter(item) {
    const size = itemSize(item);
    return {
      x: item.x + size.w / 2,
      y: item.y + size.h / 2
    };
  }

  function itemSize(item) {
    if (item.type === "label") {
      const size = item.size || 24;
      return {
        w: Math.max(60, String(item.text || "").length * size),
        h: size + 16
      };
    }
    return {
      w: Math.max(1, Number(item.w) || 1),
      h: Math.max(1, Number(item.h) || 1)
    };
  }

  function rectsIntersect(a, b) {
    return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
  }

  function rotatePoint(point, center, radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  }

  function onStageDragOver(event) {
    if (!hasDragType(event.dataTransfer, "text/person-id") && !hasDragType(event.dataTransfer, "text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onStageDrop(event) {
    const personId = event.dataTransfer.getData("text/person-id") || event.dataTransfer.getData("text/plain");
    const seatNode = event.target.closest("[data-seat-id]");
    if (!personId || !seatNode) return;
    event.preventDefault();
    commitHistory();
    assignPersonToSeat(personId, seatNode.dataset.seatId);
    setSelection([seatNode.dataset.seatId]);
    renderAll();
    scheduleSave();
  }

  function onPersonDragStart(event) {
    const card = event.target.closest("[data-person-id]");
    if (!card) return;
    event.dataTransfer.setData("text/person-id", card.dataset.personId);
    event.dataTransfer.setData("text/plain", card.dataset.personId);
    event.dataTransfer.effectAllowed = "move";
  }

  function onPeopleListClick(event) {
    const removeButton = event.target.closest("[data-remove-person]");
    if (removeButton) {
      removePerson(removeButton.dataset.removePerson);
      return;
    }

    const card = event.target.closest("[data-person-id]");
    if (!card) return;
    const selected = getSelectedItem();
    if (selected && selected.type === "seat") {
      commitHistory();
      assignPersonToSeat(card.dataset.personId, selected.id);
      renderAll();
      scheduleSave();
    }
  }

  function onKeyDown(event) {
    const activeTag = document.activeElement ? document.activeElement.tagName : "";
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag);

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveLocal();
      pulseButton(els.saveBtn, "已保存", "保存");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }

    if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selectAllItems();
      return;
    }

    if (editing) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelected();
    } else if (event.key === "[") {
      event.preventDefault();
      rotateSelectionBy(-15);
    } else if (event.key === "]") {
      event.preventDefault();
      rotateSelectionBy(15);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateSelected();
    } else if (event.key === "Escape") {
      if (els.draftViewer.classList.contains("is-open")) {
        closeDraftViewer();
        return;
      }
      draft = null;
      action = null;
      setTool("select");
    }
  }

  function renderAll() {
    setViewBox();
    els.roomNameInput.value = state.title || "未命名会议室";
    els.snapToggle.checked = !!state.settings.snap;
    els.referenceToggle.checked = !!state.settings.showReference;
    renderReference();
    renderStage();
    renderPeople();
    renderInspector();
    renderStatus();
    updateHistoryButtons();
  }

  function renderReference() {
    els.referenceSection.classList.toggle("is-hidden", !state.settings.showReference);
    els.referenceImage.src = state.draftImage && state.draftImage.src ? state.draftImage.src : DRAFT_PLACEHOLDER;
    els.referenceImage.alt = state.draftImage && state.draftImage.name ? `导入草稿：${state.draftImage.name}` : "未导入草稿";
  }

  function openDraftViewer() {
    const src = state.draftImage && state.draftImage.src ? state.draftImage.src : DRAFT_PLACEHOLDER;
    els.draftViewerImage.src = src;
    els.draftViewerImage.alt = state.draftImage && state.draftImage.name ? `放大查看草稿：${state.draftImage.name}` : "放大查看草稿";
    els.draftViewerTitle.textContent = state.draftImage && state.draftImage.name ? state.draftImage.name : "草稿";
    els.draftViewer.classList.add("is-open");
    els.draftViewer.setAttribute("aria-hidden", "false");
    resetDraftViewer();
  }

  function closeDraftViewer() {
    els.draftViewer.classList.remove("is-open");
    els.draftViewer.setAttribute("aria-hidden", "true");
    draftViewer.drag = null;
  }

  function resetDraftViewer() {
    draftViewer = { scale: 1, x: 0, y: 0, drag: null };
    renderDraftViewerTransform();
  }

  function zoomDraftViewer(factor) {
    draftViewer.scale = clamp(draftViewer.scale * factor, 0.25, 6);
    renderDraftViewerTransform();
  }

  function renderDraftViewerTransform() {
    els.draftViewerImage.style.transform = `translate(calc(-50% + ${draftViewer.x}px), calc(-50% + ${draftViewer.y}px)) scale(${draftViewer.scale})`;
  }

  function onDraftViewerPointerDown(event) {
    draftViewer.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: draftViewer.x,
      y: draftViewer.y
    };
    els.draftViewerStage.setPointerCapture(event.pointerId);
  }

  function onDraftViewerPointerMove(event) {
    if (!draftViewer.drag) return;
    draftViewer.x = draftViewer.drag.x + event.clientX - draftViewer.drag.startX;
    draftViewer.y = draftViewer.drag.y + event.clientY - draftViewer.drag.startY;
    renderDraftViewerTransform();
  }

  function onDraftViewerPointerUp(event) {
    if (!draftViewer.drag) return;
    try {
      els.draftViewerStage.releasePointerCapture(draftViewer.drag.pointerId || event.pointerId);
    } catch (error) {
      // Pointer capture may already be released.
    }
    draftViewer.drag = null;
  }

  function onDraftViewerWheel(event) {
    event.preventDefault();
    zoomDraftViewer(event.deltaY < 0 ? 1.08 : 0.92);
  }

  function renderStage() {
    renderImportedDraft();
    els.itemsLayer.replaceChildren();
    const orderedItems = [...state.items].sort((a, b) => typeRank(a.type) - typeRank(b.type));
    orderedItems.forEach((item) => {
      if (item.type === "table") els.itemsLayer.appendChild(renderTable(item));
      if (item.type === "shape") els.itemsLayer.appendChild(renderShape(item));
      if (item.type === "seat") els.itemsLayer.appendChild(renderSeat(item));
      if (item.type === "label") els.itemsLayer.appendChild(renderLabel(item));
    });
    renderDraft();
  }

  function renderDraft() {
    els.draftLayer.replaceChildren();
    if (!draft) return;
    if (draft.type === "marquee") {
      els.draftLayer.appendChild(svgEl("rect", {
        class: "marquee-rect",
        x: draft.x,
        y: draft.y,
        width: Math.max(0, draft.w),
        height: Math.max(0, draft.h),
        rx: 4
      }));
      return;
    }
    if (draft.type !== "draw") return;
    if (draft.kind === "circle") {
      els.draftLayer.appendChild(svgEl("ellipse", {
        class: "draft-rect",
        cx: draft.x + draft.w / 2,
        cy: draft.y + draft.h / 2,
        rx: Math.max(0, draft.w / 2),
        ry: Math.max(0, draft.h / 2)
      }));
      return;
    }
    if (draft.kind === "triangle") {
      els.draftLayer.appendChild(svgEl("polygon", {
        class: "draft-rect",
        points: `${draft.x + draft.w / 2},${draft.y} ${draft.x + draft.w},${draft.y + draft.h} ${draft.x},${draft.y + draft.h}`
      }));
      return;
    }
    els.draftLayer.appendChild(svgEl("rect", {
      class: "draft-rect",
      x: draft.x,
      y: draft.y,
      width: Math.max(0, draft.w),
      height: Math.max(0, draft.h),
      rx: draft.kind === "roundRect" || draft.kind === "table" ? 8 : 0
    }));
  }

  function renderImportedDraft() {
    els.referenceLayer.replaceChildren();
    if (!state.settings.showReference || !state.draftImage || !state.draftImage.src) return;
    els.referenceLayer.appendChild(svgEl("image", {
      class: "imported-draft",
      href: state.draftImage.src,
      x: 0,
      y: 0,
      width: WORKSPACE.width,
      height: WORKSPACE.height,
      preserveAspectRatio: "xMidYMid meet",
      opacity: 0.26
    }));
  }

  function renderTable(item) {
    const group = svgEl("g", {
      class: "item table-item",
      "data-id": item.id,
      transform: transformFor(item)
    });
    group.appendChild(svgEl("rect", {
      class: "table-rect",
      x: 0,
      y: 0,
      width: item.w,
      height: item.h,
      rx: 8,
      fill: item.fill || "#e7d5b4"
    }));
    if (item.label) {
      group.appendChild(svgText(item.label, item.w / 2, item.h / 2, {
        class: "table-label"
      }));
    }
    if (isSelected(item.id)) addSelectionChrome(group, item, true);
    return group;
  }

  function renderSeat(item) {
    const person = item.personId ? getPerson(item.personId) : null;
    const color = person ? colorForUnit(person.id || person.name) : "#fffdf8";
    const stroke = person ? shade(color, -42) : "#52615b";
    const group = svgEl("g", {
      class: "item seat-item",
      "data-id": item.id,
      "data-seat-id": item.id,
      transform: transformFor(item)
    });
    if (person) {
      group.appendChild(svgTitle(person.name));
    }

    group.appendChild(svgEl("rect", {
      class: "seat-shell",
      x: 3,
      y: 11,
      width: item.w - 6,
      height: item.h - 14,
      rx: 8,
      fill: color,
      stroke
    }));
    group.appendChild(svgEl("rect", {
      class: "seat-back",
      x: 8,
      y: item.h - 16,
      width: item.w - 16,
      height: 13,
      rx: 6,
      fill: person ? shade(color, -18) : "#e7dfd2"
    }));
    group.appendChild(svgEl("path", {
      class: "seat-front",
      d: `M ${item.w / 2 - 8} 7 L ${item.w / 2} 2 L ${item.w / 2 + 8} 7`,
      fill: "none",
      stroke: person ? shade(color, -55) : "#52615b",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));

    if (person) {
      renderSeatText(group, person.name, item);
    } else {
      group.appendChild(svgText(item.label || "空位", item.w / 2, item.h / 2 + 4, {
        class: "seat-empty"
      }));
    }

    if (isSelected(item.id)) addSelectionChrome(group, item, true);
    return group;
  }

  function renderSeatText(group, name, item) {
    const textGroup = svgEl("g", {
      transform: `rotate(${-(item.rotation || 0)} ${item.w / 2} ${item.h / 2})`
    });
    const preferredSize = item.nameSize || 15;
    const nameLines = wrapText(name, item.w - 14, preferredSize, 2);
    const nameSize = fitFontSize(nameLines, item.w - 14, preferredSize, 8);
    const startY = item.h / 2 - ((nameLines.length - 1) * (nameSize + 2)) / 2;
    nameLines.forEach((line, index) => {
      textGroup.appendChild(svgText(line, item.w / 2, startY + index * (nameSize + 2), {
        class: "seat-name",
        "font-size": nameSize,
        fill: item.nameColor || "#211f1b"
      }));
    });
    group.appendChild(textGroup);
  }

  function renderShape(item) {
    const group = svgEl("g", {
      class: "item shape-item",
      "data-id": item.id,
      transform: transformFor(item)
    });
    const fill = item.fill || "#dbe8e6";
    const stroke = item.stroke || "#28766f";

    if (item.kind === "circle") {
      group.appendChild(svgEl("ellipse", {
        class: "shape-fill",
        cx: item.w / 2,
        cy: item.h / 2,
        rx: item.w / 2,
        ry: item.h / 2,
        fill,
        stroke
      }));
    } else if (item.kind === "triangle") {
      group.appendChild(svgEl("polygon", {
        class: "shape-fill",
        points: `${item.w / 2},0 ${item.w},${item.h} 0,${item.h}`,
        fill,
        stroke
      }));
    } else {
      group.appendChild(svgEl("rect", {
        class: "shape-fill",
        x: 0,
        y: 0,
        width: item.w,
        height: item.h,
        rx: item.kind === "roundRect" ? Math.min(24, item.w / 4, item.h / 4) : 0,
        fill,
        stroke
      }));
    }

    if (item.label) {
      group.appendChild(svgText(item.label, item.w / 2, item.h / 2, {
        class: "shape-label"
      }));
    }
    if (isSelected(item.id)) addSelectionChrome(group, item, true);
    return group;
  }

  function renderLabel(item) {
    const group = svgEl("g", {
      class: "item label-item",
      "data-id": item.id,
      transform: transformFor(item)
    });
    const text = svgText(item.text || "标注", 0, 0, {
      class: "layout-label",
      "font-size": item.size || 24
    });
    const width = Math.max(item.w || 0, Math.max(60, String(item.text || "").length * (item.size || 24)));
    const height = item.h || (item.size || 24) + 16;
    group.appendChild(svgEl("rect", {
      class: "label-hitbox",
      x: -8,
      y: -(item.size || 24),
      width,
      height,
      rx: 6
    }));
    group.appendChild(text);
    if (isSelected(item.id)) {
      group.appendChild(svgEl("rect", {
        class: "selected-outline",
        x: -8,
        y: -(item.size || 24),
        width,
        height,
        rx: 8
      }));
      addRotateHandle(group, item, width, item.size || 24, -8, -(item.size || 24));
      addResizeHandles(group, item, width, height, -8, -(item.size || 24));
    }
    return group;
  }

  function addSelectionChrome(group, item, resizable) {
    group.appendChild(svgEl("rect", {
      class: "selected-outline",
      x: -5,
      y: -5,
      width: item.w + 10,
      height: item.h + 10,
      rx: 10
    }));
    addRotateHandle(group, item, item.w, item.h, 0, 0);
    if (!resizable) return;
    addResizeHandles(group, item, item.w, item.h);
  }

  function addResizeHandles(group, item, width, height, xOffset = 0, yOffset = 0) {
    const handles = [
      ["nw", xOffset - 8, yOffset - 8],
      ["ne", xOffset + width - 2, yOffset - 8],
      ["sw", xOffset - 8, yOffset + height - 2],
      ["se", xOffset + width - 2, yOffset + height - 2]
    ];
    handles.forEach(([name, x, y]) => {
      group.appendChild(svgEl("rect", {
        class: "resize-handle",
        "data-id": item.id,
        "data-resize": name,
        x,
        y,
        width: 10,
        height: 10,
        rx: 2
      }));
    });
  }

  function addRotateHandle(group, item, width, height, xOffset = 0, yOffset = 0) {
    const cx = xOffset + width / 2;
    const cy = yOffset - 26;
    group.appendChild(svgEl("line", {
      class: "rotate-stem",
      x1: cx,
      y1: yOffset - 4,
      x2: cx,
      y2: cy + 8
    }));
    group.appendChild(svgEl("circle", {
      class: "rotate-handle",
      "data-id": item.id,
      "data-rotate": "true",
      cx,
      cy,
      r: 9
    }));
  }

  function renderPeople() {
    const query = els.personSearch.value.trim().toLowerCase();
    const people = state.people.filter((person) => {
      if (!query) return true;
      return person.name.toLowerCase().includes(query);
    });

    els.peopleList.replaceChildren();
    if (!people.length) {
      const empty = document.createElement("div");
      empty.className = "empty-list";
      empty.textContent = state.people.length ? "没有匹配结果" : "还没有名单";
      els.peopleList.appendChild(empty);
      return;
    }

    people.forEach((person) => {
      const card = document.createElement("div");
      card.className = `person-card${person.assignedSeatId ? " is-assigned" : ""}`;
      card.draggable = true;
      card.dataset.personId = person.id;

      const swatch = document.createElement("span");
      swatch.className = "person-swatch";
      swatch.style.background = colorForUnit(person.unit);

      const text = document.createElement("div");
      const name = document.createElement("div");
      name.className = "person-name";
      name.textContent = person.name;
      text.append(name);

      const meta = document.createElement("div");
      meta.className = "person-meta";
      const seat = document.createElement("span");
      seat.className = "person-seat";
      seat.textContent = person.assignedSeatId ? seatLabel(person.assignedSeatId) : "待排";
      const remove = document.createElement("button");
      remove.className = "person-remove";
      remove.type = "button";
      remove.title = "移除";
      remove.dataset.removePerson = person.id;
      remove.textContent = "×";
      meta.append(seat, remove);

      card.append(swatch, text, meta);
      els.peopleList.appendChild(card);
    });
  }

  function renderInspector() {
    const items = getSelectedItems();
    const item = items[0] || null;
    if (items.length > 1) {
      renderMultiInspector(items);
      return;
    }
    if (!item) {
      const seats = getSeats();
      const assigned = seats.filter((seat) => seat.personId).length;
      els.inspector.innerHTML = `
        <div class="inspector-empty">
          <strong>${seats.length}</strong> 个座位，<strong>${assigned}</strong> 个已安排。<br>
          <strong>${state.people.length}</strong> 人名单。
        </div>
      `;
      return;
    }

    if (item.type === "table") renderTableInspector(item);
    if (item.type === "shape") renderShapeInspector(item);
    if (item.type === "seat") renderSeatInspector(item);
    if (item.type === "label") renderLabelInspector(item);
  }

  function renderMultiInspector(items) {
    const bounds = boundsForItems(items);
    const seats = items.filter((item) => item.type === "seat").length;
    const tables = items.filter((item) => item.type === "table").length;
    const shapes = items.filter((item) => item.type === "shape").length;
    const labels = items.filter((item) => item.type === "label").length;
    const groups = unique(items.map((item) => item.groupId)).length;
    els.inspector.innerHTML = `
      <div class="inspector-empty">
        <strong>${items.length}</strong> 个对象已选择<br>
        桌面 ${tables} · 图形 ${shapes} · 座位 ${seats} · 文字 ${labels}${groups ? ` · 组合 ${groups}` : ""}
      </div>
      <div class="field-grid">
        ${fieldHtml("整体旋转", "batchRotation", 0, "number", "full")}
      </div>
      <div class="align-grid">
        <button class="mini-btn" data-action="align-left" type="button">左对齐</button>
        <button class="mini-btn" data-action="align-center" type="button">水平居中</button>
        <button class="mini-btn" data-action="align-right" type="button">右对齐</button>
        <button class="mini-btn" data-action="align-top" type="button">顶对齐</button>
        <button class="mini-btn" data-action="align-middle" type="button">垂直居中</button>
        <button class="mini-btn" data-action="align-bottom" type="button">底对齐</button>
      </div>
      <div class="inspector-empty">
        范围：${round(bounds.w)} × ${round(bounds.h)}
      </div>
      <div class="inspector-actions">
        <button class="mini-btn" data-action="duplicate" type="button">复制</button>
        <button class="mini-btn danger" data-action="delete" type="button">删除</button>
      </div>
    `;
    bindInspectorInputs();
  }

  function renderTableInspector(item) {
    els.inspector.innerHTML = `
      <div class="field-grid">
        ${fieldHtml("名称", "label", item.label || "", "text", "full")}
        ${fieldHtml("X", "x", round(item.x), "number")}
        ${fieldHtml("Y", "y", round(item.y), "number")}
        ${fieldHtml("宽", "w", round(item.w), "number")}
        ${fieldHtml("高", "h", round(item.h), "number")}
        ${fieldHtml("旋转", "rotation", round(item.rotation || 0), "number")}
        <div class="field">
          <label>颜色</label>
          <input data-prop="fill" type="color" value="${escapeAttr(item.fill || "#e7d5b4")}">
        </div>
      </div>
      <div class="inspector-actions">
        <button class="mini-btn" data-action="duplicate" type="button">复制</button>
        <button class="mini-btn danger" data-action="delete" type="button">删除</button>
      </div>
    `;
    bindInspectorInputs();
  }

  function renderShapeInspector(item) {
    els.inspector.innerHTML = `
      <div class="field-grid">
        ${fieldHtml("名称", "label", item.label || "", "text", "full")}
        ${fieldHtml("X", "x", round(item.x), "number")}
        ${fieldHtml("Y", "y", round(item.y), "number")}
        ${fieldHtml("宽", "w", round(item.w), "number")}
        ${fieldHtml("高", "h", round(item.h), "number")}
        ${fieldHtml("旋转", "rotation", round(item.rotation || 0), "number")}
        <div class="field">
          <label>填充</label>
          <input data-prop="fill" type="color" value="${escapeAttr(item.fill || "#dbe8e6")}">
        </div>
        <div class="field">
          <label>描边</label>
          <input data-prop="stroke" type="color" value="${escapeAttr(item.stroke || "#28766f")}">
        </div>
      </div>
      <div class="inspector-actions">
        <button class="mini-btn" data-action="duplicate" type="button">复制</button>
        <button class="mini-btn danger" data-action="delete" type="button">删除</button>
      </div>
    `;
    bindInspectorInputs();
  }

  function renderSeatInspector(item) {
    const personOptions = [
      `<option value="">空位</option>`,
      ...state.people.map((person) => {
        const selected = item.personId === person.id ? " selected" : "";
        return `<option value="${escapeAttr(person.id)}"${selected}>${escapeHtml(person.name)}</option>`;
      })
    ].join("");

    els.inspector.innerHTML = `
      <div class="field-grid">
        ${fieldHtml("座位号", "label", item.label || "", "text", "full")}
        <div class="field full">
          <label>人员</label>
          <select id="seatPersonSelect">${personOptions}</select>
        </div>
        ${fieldHtml("X", "x", round(item.x), "number")}
        ${fieldHtml("Y", "y", round(item.y), "number")}
        ${fieldHtml("宽", "w", round(item.w), "number")}
        ${fieldHtml("高", "h", round(item.h), "number")}
        ${fieldHtml("姓名字号", "nameSize", round(item.nameSize || 15), "number")}
        ${fieldHtml("旋转", "rotation", round(item.rotation || 0), "number")}
        <div class="field full">
          <label>姓名颜色</label>
          <input data-prop="nameColor" type="color" value="${escapeAttr(item.nameColor || "#211f1b")}">
        </div>
      </div>
      <div class="inspector-actions">
        <button class="mini-btn" data-action="unassign" type="button">置空</button>
        <button class="mini-btn danger" data-action="delete" type="button">删除</button>
      </div>
    `;
    bindInspectorInputs();
    const select = els.inspector.querySelector("#seatPersonSelect");
    select.addEventListener("change", () => {
      commitHistory();
      if (select.value) assignPersonToSeat(select.value, item.id);
      else unassignSeat(item.id);
      renderAll();
      scheduleSave();
    });
  }

  function renderLabelInspector(item) {
    els.inspector.innerHTML = `
      <div class="field-grid">
        <div class="field full">
          <label>文字</label>
          <textarea data-prop="text" rows="3">${escapeHtml(item.text || "")}</textarea>
        </div>
        ${fieldHtml("X", "x", round(item.x), "number")}
        ${fieldHtml("Y", "y", round(item.y), "number")}
        ${fieldHtml("字号", "size", round(item.size || 24), "number")}
        ${fieldHtml("旋转", "rotation", round(item.rotation || 0), "number")}
      </div>
      <div class="inspector-actions">
        <button class="mini-btn" data-action="duplicate" type="button">复制</button>
        <button class="mini-btn danger" data-action="delete" type="button">删除</button>
      </div>
    `;
    bindInspectorInputs();
  }

  function bindInspectorInputs() {
    els.inspector.querySelectorAll("[data-prop]").forEach((input) => {
      input.addEventListener("focus", () => commitHistory(), { once: true });
      input.addEventListener("input", () => {
        const prop = input.dataset.prop;
        let value = input.value;
        if (input.type === "number") value = Number.parseFloat(input.value) || 0;
        if (prop === "batchRotation") {
          getSelectedItems().forEach((selectedItem) => {
            selectedItem.rotation = value;
          });
          renderStage();
          renderStatus();
          scheduleSave();
          return;
        }
        const item = getSelectedItem();
        if (!item) return;
        item[prop] = value;
        if (["w", "h"].includes(prop)) item[prop] = Math.max(16, item[prop]);
        if (item.type === "label" && prop === "text") {
          item.w = Math.max(item.w || 0, Math.max(60, String(item.text || "").length * (item.size || 24)));
          item.h = Math.max(item.h || 0, (item.size || 24) + 16);
        }
        renderStage();
        renderStatus();
        scheduleSave();
      });
    });

    els.inspector.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.action === "duplicate") duplicateSelected();
        if (button.dataset.action === "delete") deleteSelected();
        if (button.dataset.action && button.dataset.action.startsWith("align-")) alignSelected(button.dataset.action.replace("align-", ""));
        if (button.dataset.action === "unassign") {
          const item = getSelectedItem();
          if (item && item.type === "seat") {
            commitHistory();
            unassignSeat(item.id);
            renderAll();
            scheduleSave();
          }
        }
      });
    });
  }

  function renderStatus() {
    const seats = getSeats();
    const assigned = seats.filter((seat) => seat.personId).length;
    const peopleAssigned = state.people.filter((person) => person.assignedSeatId).length;
    els.statusLine.textContent = `${seats.length}个座位 · ${assigned}个已安排 · ${state.people.length}人名单`;
    els.rosterCount.textContent = `${state.people.length}人`;
    els.canvasTitle.textContent = state.title || "未命名会议室";

    const selected = getSelectedItem();
    const selectedItems = getSelectedItems();
    if (selectedItems.length > 1) {
      els.selectionHint.textContent = `已选择 ${selectedItems.length} 个对象`;
      return;
    }
    if (!selected) {
      els.selectionHint.textContent = `${peopleAssigned}/${state.people.length} 人已落座`;
      return;
    }
    if (selected.type === "table") els.selectionHint.textContent = `已选择桌面：${selected.label || "未命名"}`;
    if (selected.type === "shape") els.selectionHint.textContent = `已选择图形：${selected.label || "未命名"}`;
    if (selected.type === "seat") els.selectionHint.textContent = `已选择座位：${selected.label || selected.id}`;
    if (selected.type === "label") els.selectionHint.textContent = `已选择文字：${selected.text || ""}`;
  }

  function updateHistoryButtons() {
    const hasSelection = getSelectedIds().length > 0;
    const selectedItems = getSelectedItems();
    const hasGroup = selectedItems.some((item) => item.groupId);
    els.undoBtn.disabled = history.length === 0;
    els.redoBtn.disabled = redoStack.length === 0;
    els.rotateLeftBtn.disabled = !hasSelection;
    els.rotateRightBtn.disabled = !hasSelection;
    els.groupBtn.disabled = selectedItems.length < 2;
    els.ungroupBtn.disabled = !hasGroup;
    els.duplicateBtn.disabled = !hasSelection;
    els.deleteBtn.disabled = !hasSelection;
    els.draftClearBtn.disabled = !state.draftImage;
  }

  function fieldHtml(label, prop, value, type = "text", extraClass = "") {
    return `
      <div class="field ${extraClass}">
        <label>${escapeHtml(label)}</label>
        <input data-prop="${escapeAttr(prop)}" type="${escapeAttr(type)}" value="${escapeAttr(String(value))}">
      </div>
    `;
  }

  function createTable(x, y, w, h, label = "", fill = "#e7d5b4") {
    return {
      id: makeId("table"),
      type: "table",
      x,
      y,
      w,
      h,
      rotation: 0,
      label,
      fill
    };
  }

  function createSeat(x, y, label = "S01", rotation = 0, w = 86, h = 48) {
    return {
      id: makeId("seat"),
      type: "seat",
      x,
      y,
      w,
      h,
      rotation,
      label,
      personId: null,
      nameSize: 15,
      nameColor: "#211f1b"
    };
  }

  function createShape(x, y, w, h, kind = "rect") {
    const names = {
      rect: "矩形",
      roundRect: "圆角矩形",
      circle: "圆形",
      triangle: "三角形"
    };
    return {
      id: makeId("shape"),
      type: "shape",
      kind,
      x,
      y,
      w,
      h,
      rotation: 0,
      label: "",
      fill: "#dbe8e6",
      stroke: "#28766f"
    };
  }

  function createLabel(x, y, text = "标注", size = 24) {
    return {
      id: makeId("label"),
      type: "label",
      x,
      y,
      w: Math.max(60, String(text || "").length * size),
      h: size + 16,
      rotation: 0,
      text,
      size
    };
  }

  function addHorizontalStrip(items, x, y, w, h, count, prefix, label) {
    items.push(createTable(x, y, w, h, label, "#e4d1aa"));
    const cell = w / count;
    for (let index = 0; index < count; index += 1) {
      items.push(createSeat(x + index * cell + 5, y + h + 10, `${prefix}${index + 1}`, 0, cell - 10, 48));
    }
  }

  function importDraftFile() {
    const file = els.draftFile.files && els.draftFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      commitHistory();
      state.draftImage = {
        src: String(reader.result || ""),
        name: file.name,
        importedAt: new Date().toISOString()
      };
      state.settings.showReference = true;
      renderAll();
      scheduleSave();
      pulseButton(els.draftImportBtn, "已导入", "导入草稿");
    };
    reader.readAsDataURL(file);
    els.draftFile.value = "";
  }

  function clearDraftImage() {
    if (!state.draftImage) {
      pulseButton(els.draftClearBtn, "无草稿", "清除草稿");
      return;
    }
    commitHistory();
    state.draftImage = null;
    renderAll();
    scheduleSave();
  }

  function autoLayoutFromDraft() {
    if (!state.draftImage || !state.draftImage.src) {
      pulseButton(els.draftAutoBtn, "先导入草稿", "草稿自动布局");
      return;
    }

    analyzeDraftImage(state.draftImage.src)
      .then((analysis) => {
        commitHistory();
        state.items = buildAutoLayoutFromAnalysis(analysis);
        state.people.forEach((person) => {
          person.assignedSeatId = null;
        });
        clearSelection();
        fitView(false);
        renderAll();
        scheduleSave();
        pulseButton(els.draftAutoBtn, "已布局", "草稿自动布局");
      })
      .catch(() => {
        pulseButton(els.draftAutoBtn, "识别失败", "草稿自动布局");
      });
  }

  function analyzeDraftImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 360;
        const scale = Math.min(1, maxWidth / image.naturalWidth);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          pixels.push(gray);
        }
        const sorted = [...pixels].sort((a, b) => a - b);
        const cutoff = sorted[Math.floor(sorted.length * 0.28)] || 120;
        const threshold = Math.min(170, Math.max(70, cutoff + 18));
        const rowInk = Array.from({ length: height }, () => 0);
        const colInk = Array.from({ length: width }, () => 0);
        let inkCount = 0;
        pixels.forEach((gray, index) => {
          if (gray > threshold) return;
          const x = index % width;
          const y = Math.floor(index / width);
          rowInk[y] += 1;
          colInk[x] += 1;
          inkCount += 1;
        });
        resolve({
          width,
          height,
          inkRatio: inkCount / pixels.length,
          horizontalBands: bandsFromProjection(rowInk, width * 0.035),
          verticalBands: bandsFromProjection(colInk, height * 0.035),
          bounds: inkBounds(pixels, width, height, threshold)
        });
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function bandsFromProjection(values, minimumInk) {
    const bands = [];
    let start = null;
    values.forEach((value, index) => {
      if (value >= minimumInk && start === null) start = index;
      if ((value < minimumInk || index === values.length - 1) && start !== null) {
        const end = value < minimumInk ? index - 1 : index;
        if (end - start >= 2) bands.push({ start, end, center: (start + end) / 2, size: end - start + 1 });
        start = null;
      }
    });
    return bands;
  }

  function inkBounds(pixels, width, height, threshold) {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    pixels.forEach((gray, index) => {
      if (gray > threshold) return;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    if (minX > maxX || minY > maxY) return null;
    return { minX, minY, maxX, maxY };
  }

  function buildAutoLayoutFromAnalysis(analysis) {
    if (!analysis || analysis.inkRatio < 0.001 || !analysis.bounds) throw new Error("草稿线条不足");
    const broadHorizontal = analysis.horizontalBands.filter((band) => band.size > analysis.height * 0.025);
    const broadVertical = analysis.verticalBands.filter((band) => band.size > analysis.width * 0.025);

    const items = [];
    const xScale = WORKSPACE.width / analysis.width;
    const yScale = WORKSPACE.height / analysis.height;
    const xBands = mergeCloseBands(broadVertical.length ? broadVertical : analysis.verticalBands, analysis.width * 0.04);
    const yBands = mergeCloseBands(broadHorizontal.length ? broadHorizontal : analysis.horizontalBands, analysis.height * 0.04);
    if (xBands.length < 2) {
      xBands.push({ center: analysis.bounds.minX }, { center: analysis.bounds.maxX });
    }
    if (yBands.length < 2) {
      yBands.push({ center: analysis.bounds.minY }, { center: analysis.bounds.maxY });
    }

    const minX = clamp(Math.min(...xBands.map((band) => band.center)) * xScale - 80, 60, WORKSPACE.width - 260);
    const maxX = clamp(Math.max(...xBands.map((band) => band.center)) * xScale + 80, minX + 220, WORKSPACE.width - 60);
    const minY = clamp(Math.min(...yBands.map((band) => band.center)) * yScale - 60, 80, WORKSPACE.height - 220);
    const maxY = clamp(Math.max(...yBands.map((band) => band.center)) * yScale + 60, minY + 160, WORKSPACE.height - 80);
    const tableW = clamp(maxX - minX, 220, 760);
    const tableH = clamp(maxY - minY, 100, 320);
    const tableX = clamp((minX + maxX - tableW) / 2, 60, WORKSPACE.width - tableW - 60);
    const tableY = clamp((minY + maxY - tableH) / 2, 80, WORKSPACE.height - tableH - 80);
    items.push(createTable(tableX, tableY, tableW, tableH, "", "#ead8b8"));

    const topCount = clamp(countBandsInRange(xBands, minX / xScale, maxX / xScale), 2, 10);
    const bottomCount = clamp(Math.max(topCount, Math.round(analysis.verticalBands.length / 3)), 2, 12);
    const sideCount = clamp(countBandsInRange(yBands, minY / yScale, maxY / yScale), 1, 6);

    distribute(topCount, tableX + 22, tableX + tableW - 22).forEach((x, index) => {
      items.push(createSeat(x - 43, tableY - 58, `A${index + 1}`, 180));
    });
    distribute(bottomCount, tableX + 22, tableX + tableW - 22).forEach((x, index) => {
      items.push(createSeat(x - 43, tableY + tableH + 10, `B${index + 1}`, 0));
    });
    distribute(sideCount, tableY + 18, tableY + tableH - 18).forEach((y, index) => {
      items.push(createSeat(tableX - 96, y - 24, `C${index + 1}`, 90));
      items.push(createSeat(tableX + tableW + 10, y - 24, `D${index + 1}`, -90));
    });

    const lowerBands = yBands.filter((band) => band.center * yScale > tableY + tableH + 120);
    lowerBands.slice(0, 3).forEach((band, rowIndex) => {
      const y = clamp(band.center * yScale, tableY + tableH + 130, WORKSPACE.height - 95);
      const count = clamp(Math.round(xBands.length * 1.4), 4, 10);
      items.push(createTable(tableX, y, tableW, 52, "", "#e4d1aa"));
      distribute(count, tableX + 20, tableX + tableW - 20).forEach((x, index) => {
        items.push(createSeat(x - 40, y + 62, `R${rowIndex + 1}-${index + 1}`, 0, 80, 46));
      });
    });

    const leftBands = xBands.filter((band) => band.center * xScale < tableX - 120);
    leftBands.slice(0, 4).forEach((band, colIndex) => {
      const x = clamp(band.center * xScale, 70, tableX - 120);
      const count = clamp(sideCount + 2, 3, 8);
      items.push(createTable(x, tableY, 58, clamp(tableH + 140, 220, 520), "", "#e8d3ac"));
      distribute(count, tableY + 28, tableY + Math.min(tableH + 110, 500)).forEach((y, index) => {
        items.push(createSeat(x - 92, y - 24, `L${colIndex + 1}-${index + 1}`, 90, 78, 50));
      });
    });

    if (!items.some((item) => item.type === "seat")) {
      throw new Error("未识别到座位结构");
    }
    return items;
  }

  function mergeCloseBands(bands, gap) {
    const sorted = [...bands].sort((a, b) => a.center - b.center);
    const merged = [];
    sorted.forEach((band) => {
      const last = merged[merged.length - 1];
      if (!last || band.center - last.center > gap) {
        merged.push({ ...band });
        return;
      }
      last.start = Math.min(last.start, band.start);
      last.end = Math.max(last.end, band.end);
      last.size += band.size;
      last.center = (last.start + last.end) / 2;
    });
    return merged;
  }

  function countBandsInRange(bands, min, max) {
    return bands.filter((band) => band.center >= min && band.center <= max).length;
  }

  function loadPeopleFromTextarea() {
    const parsed = parsePeopleText(els.peopleInput.value);
    if (!parsed.length) {
      pulseButton(els.loadPeopleBtn, "无名单", "载入");
      return;
    }
    commitHistory();
    appendPeople(parsed);
    els.peopleInput.value = "";
    renderAll();
    scheduleSave();
    pulseButton(els.loadPeopleBtn, "已载入", "载入");
  }

  function importPeopleFile() {
    const file = els.peopleFile.files && els.peopleFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parsePeopleText(String(reader.result || ""));
      if (!parsed.length) {
        pulseButton(els.peopleFileBtn, "无名单", "文件");
        return;
      }
      commitHistory();
      appendPeople(parsed);
      renderAll();
      scheduleSave();
      pulseButton(els.peopleFileBtn, "已导入", "文件");
    };
    reader.readAsText(file, "utf-8");
    els.peopleFile.value = "";
  }

  function appendPeople(people) {
    const existing = new Set(state.people.map((person) => `${person.name}::${person.unit || ""}`));
    people.forEach((person) => {
      const key = `${person.name}::${person.unit || ""}`;
      if (existing.has(key)) return;
      state.people.push({
        id: makeId("person"),
        name: person.name,
        unit: person.unit || "",
        assignedSeatId: null
      });
      existing.add(key);
    });
  }

  function parsePeopleText(text) {
    const raw = String(text || "").trim();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return [];

    if (lines.length === 1 && !looksLikeHeader(lines[0])) {
      const tokens = splitLoosePeopleLine(lines[0]);
      if (tokens.length > 1) {
        return unique(tokens).map((name) => ({ name, unit: "" }));
      }
    }

    const rows = lines.map(splitRow).filter((row) => row.length);
    if (!rows.length) return [];

    let startIndex = 0;
    let nameIndex = 0;
    const header = rows[0].map((cell) => cell.toLowerCase());
    const headerNameIndex = header.findIndex((cell) => /姓名|名字|人员|name/.test(cell));
    if (headerNameIndex >= 0) {
      startIndex = 1;
      nameIndex = headerNameIndex;
    }

    const people = [];
    for (let index = startIndex; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.length === 1) {
        people.push({ name: row[0], unit: "" });
        continue;
      }
      const name = row[nameIndex] || "";
      if (!name.trim()) continue;
      people.push({ name: name.trim(), unit: "" });
    }

    const seen = new Set();
    return people.filter((person) => {
      const key = person.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function looksLikeHeader(line) {
    return /姓名|名字|人员|单位|部门|公司|机构|name|unit|dept|company/i.test(line);
  }

  function splitLoosePeopleLine(line) {
    return String(line || "")
      .replace(/[、，,;；|/]+/g, " ")
      .split(/\s+/)
      .map(cleanCell)
      .filter(Boolean);
  }

  function splitRow(line) {
    const source = line.replace(/^"|"$/g, "");
    if (source.includes("\t")) return source.split("\t").map(cleanCell).filter(Boolean);
    if (/[、，,;；|/]/.test(source)) return source.split(/[、，,;；|/]/).map(cleanCell).filter(Boolean);
    return source.split(/\s+/).map(cleanCell).filter(Boolean);
  }

  function cleanCell(value) {
    return String(value || "").trim().replace(/^"|"$/g, "");
  }

  function autoAssign() {
    const seats = getSeats()
      .filter((seat) => !seat.personId)
      .sort(positionSort);
    const people = state.people
      .filter((person) => !person.assignedSeatId)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    if (!seats.length || !people.length) return;
    commitHistory();
    people.slice(0, seats.length).forEach((person, index) => assignPersonToSeat(person.id, seats[index].id));
    renderAll();
    scheduleSave();
  }

  function clearAssignments() {
    if (!getSeats().some((seat) => seat.personId)) return;
    commitHistory();
    getSeats().forEach((seat) => {
      seat.personId = null;
    });
    state.people.forEach((person) => {
      person.assignedSeatId = null;
    });
    renderAll();
    scheduleSave();
  }

  function clearPeople() {
    if (!state.people.length) return;
    if (!window.confirm("清空全部名单？座位上的人员也会移除。")) return;
    commitHistory();
    state.people = [];
    getSeats().forEach((seat) => {
      seat.personId = null;
    });
    renderAll();
    scheduleSave();
  }

  function removePerson(personId) {
    const person = getPerson(personId);
    if (!person) return;
    commitHistory();
    if (person.assignedSeatId) {
      const seat = getItem(person.assignedSeatId);
      if (seat) seat.personId = null;
    }
    state.people = state.people.filter((item) => item.id !== personId);
    renderAll();
    scheduleSave();
  }

  function clearLayout() {
    if (!state.items.length && !state.draftImage) {
      pulseButton(els.clearLayoutBtn, "已为空", "清空布局");
      return;
    }
    if (!window.confirm("确定清空当前布局和草稿底图？名单会保留，但座位分配会被清除。")) return;
    commitHistory();
    state.items = [];
    state.draftImage = null;
    state.people.forEach((person) => {
      person.assignedSeatId = null;
    });
    clearSelection();
    renderAll();
    scheduleSave();
  }

  function selectAllItems() {
    setSelection(state.items.map((item) => item.id));
    renderAll();
    scheduleSave();
  }

  function groupSelected() {
    const items = getSelectedItems();
    if (items.length < 2) return;
    commitHistory();
    const groupId = makeId("group");
    items.forEach((item) => {
      item.groupId = groupId;
    });
    setSelection(items.map((item) => item.id));
    renderAll();
    scheduleSave();
  }

  function ungroupSelected() {
    const items = getSelectedItems();
    const groupIds = unique(items.map((item) => item.groupId));
    if (!groupIds.length) return;
    commitHistory();
    state.items.forEach((item) => {
      if (groupIds.includes(item.groupId)) delete item.groupId;
    });
    renderAll();
    scheduleSave();
  }

  function assignPersonToSeat(personId, seatId) {
    const person = getPerson(personId);
    const seat = getItem(seatId);
    if (!person || !seat || seat.type !== "seat") return;

    if (person.assignedSeatId) {
      const oldSeat = getItem(person.assignedSeatId);
      if (oldSeat) oldSeat.personId = null;
    }
    if (seat.personId) {
      const oldPerson = getPerson(seat.personId);
      if (oldPerson) oldPerson.assignedSeatId = null;
    }

    seat.personId = person.id;
    person.assignedSeatId = seat.id;
  }

  function unassignSeat(seatId) {
    const seat = getItem(seatId);
    if (!seat || seat.type !== "seat") return;
    if (seat.personId) {
      const person = getPerson(seat.personId);
      if (person) person.assignedSeatId = null;
    }
    seat.personId = null;
  }

  function deleteSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    commitHistory();
    const ids = new Set(items.map((item) => item.id));
    items.forEach((item) => {
      if (item.type === "seat") unassignSeat(item.id);
    });
    state.items = state.items.filter((entry) => !ids.has(entry.id));
    clearSelection();
    renderAll();
    scheduleSave();
  }

  function duplicateSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    commitHistory();
    const copies = cloneSelectedItemsForDrag();
    copies.forEach((copy) => {
      copy.x += 24;
      copy.y += 24;
    });
    state.items.push(...copies);
    setSelection(copies.map((copy) => copy.id));
    renderAll();
    scheduleSave();
  }

  function cloneSelectedItemsForDrag(sourceItems = null) {
    const items = sourceItems || getSelectedItems();
    if (!items.length) return [];
    const groupMap = new Map();
    return items.map((item) => {
      const copy = cloneItem(item);
      copy.id = makeId(item.type);
      if (copy.groupId) {
        if (!groupMap.has(copy.groupId)) groupMap.set(copy.groupId, makeId("group"));
        copy.groupId = groupMap.get(copy.groupId);
      }
      if (copy.type === "seat") copy.personId = null;
      return copy;
    });
  }

  function rotateSelectionBy(degrees) {
    const items = getSelectedItems();
    if (!items.length) return;
    commitHistory();
    const ids = items.map((item) => item.id);
    const center = selectionCenter(ids);
    rotateItems({
      ids,
      center,
      origins: items.map(cloneItem)
    }, (degrees * Math.PI) / 180);
    normalizeState();
    renderAll();
    scheduleSave();
  }

  function undo() {
    if (!history.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    normalizeState();
    renderAll();
    scheduleSave();
  }

  function redo() {
    if (!redoStack.length) return;
    history.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    normalizeState();
    renderAll();
    scheduleSave();
  }

  function commitHistory() {
    history.push(JSON.stringify(state));
    if (history.length > 80) history.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function exportJson() {
    saveLocal();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, `meeting-layout-${timestamp()}.json`);
  }

  function importProjectFile() {
    const file = els.projectFile.files && els.projectFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nextState = JSON.parse(String(reader.result || ""));
        commitHistory();
        state = {
          ...createEmptyState(),
          ...nextState,
          view: nextState.view || createEmptyState().view,
          settings: { ...createEmptyState().settings, ...(nextState.settings || {}) }
        };
        normalizeState();
        renderAll();
        scheduleSave();
      } catch (error) {
        window.alert("数据文件无法读取。");
      }
    };
    reader.readAsText(file, "utf-8");
    els.projectFile.value = "";
  }

  function exportPng() {
    const svgSource = buildExportSvg();
    const blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = WORKSPACE.width * 2;
      canvas.height = WORKSPACE.height * 2;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url);
        if (!pngBlob) return;
        downloadBlob(pngBlob, `meeting-layout-${timestamp()}.png`);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      window.alert("图片导出失败。");
    };
    image.src = url;
  }

  function buildExportSvg() {
    const lines = [];
    for (let x = 0; x <= WORKSPACE.width; x += 100) {
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${WORKSPACE.height}" stroke="#ece4d6" stroke-width="1"/>`);
    }
    for (let y = 0; y <= WORKSPACE.height; y += 100) {
      lines.push(`<line x1="0" y1="${y}" x2="${WORKSPACE.width}" y2="${y}" stroke="#ece4d6" stroke-width="1"/>`);
    }

    const itemMarkup = [...state.items].sort((a, b) => typeRank(a.type) - typeRank(b.type)).map((item) => {
      if (item.type === "table") return exportTable(item);
      if (item.type === "shape") return exportShape(item);
      if (item.type === "seat") return exportSeat(item);
      if (item.type === "label") return exportLabel(item);
      return "";
    }).join("");

    const seats = getSeats();
    const assigned = seats.filter((seat) => seat.personId).length;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${WORKSPACE.width}" height="${WORKSPACE.height}" viewBox="0 0 ${WORKSPACE.width} ${WORKSPACE.height}">
        <rect width="100%" height="100%" fill="#fffaf0"/>
        ${lines.join("")}
        <text x="42" y="48" font-size="26" font-weight="800" fill="#24211d" font-family="Arial, Microsoft YaHei, sans-serif">${escapeXml(state.title || "未命名会议室")}</text>
        <text x="42" y="78" font-size="15" font-weight="700" fill="#6e675c" font-family="Arial, Microsoft YaHei, sans-serif">${seats.length}个座位 · ${assigned}个已安排 · ${state.people.length}人名单</text>
        ${itemMarkup}
      </svg>
    `;
  }

  function exportTable(item) {
    return `
      <g transform="${escapeAttr(transformFor(item))}">
        <rect x="0" y="0" width="${item.w}" height="${item.h}" rx="8" fill="${escapeAttr(item.fill || "#e7d5b4")}" stroke="#6c5b40" stroke-width="2"/>
        <text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="22" font-weight="800" fill="#3f382f" font-family="Arial, Microsoft YaHei, sans-serif">${escapeXml(item.label || "")}</text>
      </g>
    `;
  }

  function exportSeat(item) {
    const person = item.personId ? getPerson(item.personId) : null;
    const color = person ? colorForUnit(person.id || person.name) : "#fffdf8";
    const stroke = person ? shade(color, -42) : "#52615b";
    const top = person ? shade(color, -18) : "#e7dfd2";
    const preferredSize = item.nameSize || 15;
    const nameColor = item.nameColor || "#211f1b";
    const label = person ? wrapText(person.name, item.w - 14, preferredSize, 2) : [item.label || "空位"];
    const nameSize = person ? fitFontSize(label, item.w - 14, preferredSize, 8) : 12;
    const startY = item.h / 2 - ((label.length - 1) * (nameSize + 2)) / 2;
    const nameMarkup = label.map((line, index) => {
      return `<text x="${item.w / 2}" y="${person ? startY + index * (nameSize + 2) : item.h / 2 + 4}" text-anchor="middle" dominant-baseline="middle" font-size="${person ? nameSize : 12}" font-weight="800" fill="${escapeAttr(person ? nameColor : "#211f1b")}" font-family="Arial, Microsoft YaHei, sans-serif">${escapeXml(line)}</text>`;
    }).join("");
    const textRotation = item.rotation ? ` transform="rotate(${-item.rotation} ${item.w / 2} ${item.h / 2})"` : "";
    return `
      <g transform="${escapeAttr(transformFor(item))}">
        <rect x="3" y="11" width="${item.w - 6}" height="${item.h - 14}" rx="8" fill="${escapeAttr(color)}" stroke="${escapeAttr(stroke)}" stroke-width="2"/>
        <rect x="8" y="${item.h - 16}" width="${item.w - 16}" height="13" rx="6" fill="${escapeAttr(top)}" opacity="0.9"/>
        <path d="M ${item.w / 2 - 8} 7 L ${item.w / 2} 2 L ${item.w / 2 + 8} 7" fill="none" stroke="${escapeAttr(person ? shade(color, -55) : "#52615b")}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <g${textRotation}>
          ${nameMarkup}
        </g>
      </g>
    `;
  }

  function exportShape(item) {
    const fill = escapeAttr(item.fill || "#dbe8e6");
    const stroke = escapeAttr(item.stroke || "#28766f");
    let shape = "";
    if (item.kind === "circle") {
      shape = `<ellipse cx="${item.w / 2}" cy="${item.h / 2}" rx="${item.w / 2}" ry="${item.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    } else if (item.kind === "triangle") {
      shape = `<polygon points="${item.w / 2},0 ${item.w},${item.h} 0,${item.h}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    } else {
      shape = `<rect x="0" y="0" width="${item.w}" height="${item.h}" rx="${item.kind === "roundRect" ? Math.min(24, item.w / 4, item.h / 4) : 0}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    }
    return `
      <g transform="${escapeAttr(transformFor(item))}">
        ${shape}
        ${item.label ? `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="800" fill="#31514d" font-family="Arial, Microsoft YaHei, sans-serif">${escapeXml(item.label)}</text>` : ""}
      </g>
    `;
  }

  function exportLabel(item) {
    return `
      <g transform="${escapeAttr(transformFor(item))}">
        <text x="0" y="0" font-size="${item.size || 24}" font-weight="800" fill="#3b352c" font-family="Arial, Microsoft YaHei, sans-serif">${escapeXml(item.text || "")}</text>
      </g>
    `;
  }

  function setViewBox() {
    els.stage.setAttribute("viewBox", `${state.view.x} ${state.view.y} ${state.view.w} ${state.view.h}`);
  }

  function fitView(save = true) {
    state.view = { x: 0, y: 0, w: WORKSPACE.width, h: WORKSPACE.height };
    setViewBox();
    if (save) scheduleSave();
  }

  function zoomAtCenter(factor) {
    zoomAtPoint(viewCenter(), factor);
  }

  function zoomAtPoint(point, factor) {
    const oldView = state.view;
    const nextW = clamp(oldView.w * factor, 320, WORKSPACE.width * 2);
    const nextH = clamp(oldView.h * factor, 220, WORKSPACE.height * 2);
    const relX = (point.x - oldView.x) / oldView.w;
    const relY = (point.y - oldView.y) / oldView.h;
    state.view = {
      x: point.x - relX * nextW,
      y: point.y - relY * nextH,
      w: nextW,
      h: nextH
    };
    setViewBox();
    scheduleSave();
  }

  function svgPoint(event) {
    const point = els.stage.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(els.stage.getScreenCTM().inverse());
  }

  function viewCenter() {
    return {
      x: state.view.x + state.view.w / 2,
      y: state.view.y + state.view.h / 2
    };
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to save layout", error);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveLocal, 250);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function normalizeState() {
    const defaults = createEmptyState();
    state = {
      ...defaults,
      ...state,
      view: { ...defaults.view, ...(state.view || {}) },
      settings: { ...defaults.settings, ...(state.settings || {}) },
      items: Array.isArray(state.items) ? state.items : [],
      people: Array.isArray(state.people) ? state.people : [],
      selectedIds: Array.isArray(state.selectedIds) ? state.selectedIds : (state.selectedId ? [state.selectedId] : [])
    };

    state.items.forEach((item) => {
      item.id = item.id || makeId(item.type || "item");
      item.x = Number(item.x) || 0;
      item.y = Number(item.y) || 0;
      item.w = Number(item.w) || (item.type === "seat" ? 86 : 160);
      item.h = Number(item.h) || (item.type === "seat" ? 48 : 80);
      item.rotation = Number(item.rotation) || 0;
      if (item.type === "table") item.fill = item.fill || "#e7d5b4";
      if (item.type === "shape") {
        item.kind = item.kind || "rect";
        item.fill = item.fill || "#dbe8e6";
        item.stroke = item.stroke || "#28766f";
      }
      if (item.type === "seat") {
        if (item.personId === undefined) item.personId = null;
        item.nameSize = Number(item.nameSize) || 15;
        item.nameColor = item.nameColor || "#211f1b";
      }
    });

    state.people.forEach((person) => {
      person.id = person.id || makeId("person");
      person.name = String(person.name || "未命名");
      person.unit = String(person.unit || "");
      person.assignedSeatId = null;
    });

    const peopleById = new Map(state.people.map((person) => [person.id, person]));
    getSeats().forEach((seat) => {
      if (!seat.personId || !peopleById.has(seat.personId)) {
        seat.personId = null;
        return;
      }
      peopleById.get(seat.personId).assignedSeatId = seat.id;
    });

    state.selectedIds = unique(state.selectedIds).filter((id) => !!getItem(id));
    state.selectedId = state.selectedIds[0] || null;
  }

  function transformFor(item) {
    const rotation = Number(item.rotation || 0);
    if (!rotation) return `translate(${item.x} ${item.y})`;
    return `translate(${item.x} ${item.y}) rotate(${rotation} ${item.w / 2} ${item.h / 2})`;
  }

  function getItem(id) {
    return state.items.find((item) => item.id === id);
  }

  function getSelectedItem() {
    return getSelectedItems()[0] || null;
  }

  function getSelectedItems() {
    return getSelectedIds().map(getItem).filter(Boolean);
  }

  function getSelectedIds() {
    if (Array.isArray(state.selectedIds) && state.selectedIds.length) {
      return unique(state.selectedIds).filter((id) => !!getItem(id));
    }
    return state.selectedId && getItem(state.selectedId) ? [state.selectedId] : [];
  }

  function setSelection(ids) {
    state.selectedIds = unique(ids).filter((id) => !!getItem(id));
    state.selectedId = state.selectedIds[0] || null;
  }

  function clearSelection() {
    state.selectedIds = [];
    state.selectedId = null;
  }

  function toggleSelection(id) {
    const ids = getSelectedIds();
    if (ids.includes(id)) setSelection(ids.filter((selectedId) => selectedId !== id));
    else setSelection([...ids, id]);
  }

  function toggleSelectionGroup(item) {
    const ids = idsForItemSelection(item);
    const current = getSelectedIds();
    const allSelected = ids.every((id) => current.includes(id));
    if (allSelected) setSelection(current.filter((id) => !ids.includes(id)));
    else setSelection([...current, ...ids]);
  }

  function idsForItemSelection(item) {
    if (!item || !item.groupId) return item ? [item.id] : [];
    return state.items.filter((entry) => entry.groupId === item.groupId).map((entry) => entry.id);
  }

  function isSelected(id) {
    return getSelectedIds().includes(id);
  }

  function getPerson(id) {
    return state.people.find((person) => person.id === id);
  }

  function getSeats() {
    return state.items.filter((item) => item.type === "seat");
  }

  function seatLabel(seatId) {
    const seat = getItem(seatId);
    return seat ? seat.label || "座位" : "座位";
  }

  function nextSeatLabel() {
    return `S${String(getSeats().length + 1).padStart(2, "0")}`;
  }

  function makeId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function svgEl(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      element.setAttribute(key, String(value));
    });
    return element;
  }

  function svgText(text, x, y, attrs = {}) {
    const element = svgEl("text", { x, y, ...attrs });
    element.textContent = text;
    return element;
  }

  function svgTitle(text) {
    const element = svgEl("title");
    element.textContent = text;
    return element;
  }

  function cloneItem(item) {
    return JSON.parse(JSON.stringify(item));
  }

  function normalizedRect(x, y, w, h) {
    return {
      x: w < 0 ? x + w : x,
      y: h < 0 ? y + h : y,
      w: Math.abs(w),
      h: Math.abs(h)
    };
  }

  function drawRectFromPoints(start, point, constrain, kind) {
    let w = point.x - start.x;
    let h = point.y - start.y;
    if (constrain && ["rect", "roundRect", "circle", "triangle"].includes(kind)) {
      const size = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * size;
      if (kind === "triangle") {
        h = Math.sign(h || 1) * Math.max(1, Math.round(size * 0.866));
      } else {
        h = Math.sign(h || 1) * size;
      }
    }
    return normalizedRect(start.x, start.y, w, h);
  }

  function distribute(count, start, end) {
    if (count <= 1) return [start];
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, index) => start + step * index);
  }

  function snap(value) {
    return Math.round(value / 10) * 10;
  }

  function round(value) {
    return Math.round(Number(value) || 0);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeAngle(value) {
    let angle = Number(value) || 0;
    while (angle > 180) angle -= 360;
    while (angle <= -180) angle += 360;
    return Math.round(angle * 10) / 10;
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function positionSort(a, b) {
    const dy = a.y - b.y;
    if (Math.abs(dy) > 20) return dy;
    return a.x - b.x;
  }

  function typeRank(type) {
    if (type === "table") return 0;
    if (type === "shape") return 1;
    if (type === "seat") return 2;
    if (type === "label") return 3;
    return 3;
  }

  function hasDragType(dataTransfer, type) {
    if (!dataTransfer || !dataTransfer.types) return false;
    return Array.from(dataTransfer.types).includes(type);
  }

  function colorForUnit(unit) {
    const value = String(unit || "未分组");
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
  }

  function shade(hex, amount) {
    const value = hex.replace("#", "");
    const number = Number.parseInt(value.length === 3 ? value.replace(/(.)/g, "$1$1") : value, 16);
    const r = clamp((number >> 16) + amount, 0, 255);
    const g = clamp(((number >> 8) & 255) + amount, 0, 255);
    const b = clamp((number & 255) + amount, 0, 255);
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  }

  function compact(text, maxLength) {
    const chars = Array.from(String(text || ""));
    if (chars.length <= maxLength) return chars.join("");
    return `${chars.slice(0, Math.max(1, maxLength - 2)).join("")}..`;
  }

  function wrapText(text, maxWidth, fontSize, maxLines) {
    const chars = Array.from(String(text || "").trim());
    if (!chars.length) return [""];
    const perLine = Math.max(1, Math.floor(maxWidth / (fontSize * 0.62)));
    const lines = [];
    for (let index = 0; index < chars.length && lines.length < maxLines; index += perLine) {
      lines.push(chars.slice(index, index + perLine).join(""));
    }
    if (chars.length > perLine * maxLines) {
      const last = Array.from(lines[lines.length - 1]);
      lines[lines.length - 1] = `${last.slice(0, Math.max(1, last.length - 1)).join("")}…`;
    }
    return lines;
  }

  function fitFontSize(lines, maxWidth, startSize, minSize) {
    let size = startSize;
    while (size > minSize) {
      const tooWide = lines.some((line) => Array.from(line).length * size * 0.62 > maxWidth);
      if (!tooWide) break;
      size -= 1;
    }
    return size;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function escapeXml(value) {
    return escapeHtml(value);
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function timestamp() {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  }

  function pulseButton(button, text, original) {
    button.textContent = text;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1100);
  }
})();
