(() => {
  const STORAGE_KEY = "todo-app-state";
  const FILTERS = new Set(["all", "active", "completed"]);
  const state = {
    todos: [],
    filter: "all",
    editingId: null,
    pendingDelete: null
  };

  const form = document.querySelector("#todo-form");
  const input = document.querySelector("#todo-input");
  const dateInput = document.querySelector("#todo-date");
  const list = document.querySelector("#todo-list");
  const filterControls = document.querySelector("#filter-controls");
  const clearCompletedButton = document.querySelector("#clear-completed");
  const progressBar = document.querySelector("#progress-bar");
  const progressFill = document.querySelector("#progress-fill");
  const progressLabel = document.querySelector("#progress-label");
  const remainingCount = document.querySelector("#remaining-count");
  const totalCount = document.querySelector("#total-count");
  const completedCountLabel = document.querySelector("#completed-count");
  const activeCountLabel = document.querySelector("#active-count");
  const appMessage = document.querySelector("#app-message");
  const deleteDialog = document.querySelector("#delete-dialog");
  const deleteDialogDescription = document.querySelector("#delete-dialog-description");
  const cancelDeleteButton = document.querySelector("#cancel-delete");
  const confirmDeleteButton = document.querySelector("#confirm-delete");

  function getLocalDateString(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isValidDateString(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day;
  }

  function showMessage(message) {
    appMessage.textContent = message;
    appMessage.classList.remove("hidden");
  }

  function clearMessage() {
    appMessage.textContent = "";
    appMessage.classList.add("hidden");
  }

  function isValidTodo(todo) {
    return todo !== null
      && typeof todo === "object"
      && typeof todo.id === "string"
      && typeof todo.text === "string"
      && todo.text.trim().length > 0
      && typeof todo.completed === "boolean"
      && typeof todo.createdAt === "number"
      && Number.isFinite(todo.createdAt)
      && (todo.dueDate === undefined || isValidDateString(todo.dueDate));
  }

  function loadState() {
    try {
      const serializedState = window.localStorage.getItem(STORAGE_KEY);
      if (serializedState === null) return;

      const savedState = JSON.parse(serializedState);
      if (
        savedState === null
        || typeof savedState !== "object"
        || !Array.isArray(savedState.todos)
        || !savedState.todos.every(isValidTodo)
        || !FILTERS.has(savedState.filter)
      ) {
        throw new Error("저장된 할 일 데이터 형식이 올바르지 않습니다.");
      }

      state.todos = savedState.todos;
      state.filter = savedState.filter;
    } catch (error) {
      console.error("할 일 데이터를 불러오지 못했습니다.", error);
      showMessage("저장된 데이터를 불러오지 못했습니다. 새 할 일부터 다시 시작할 수 있습니다.");
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ todos: state.todos, filter: state.filter })
      );
      clearMessage();
    } catch (error) {
      console.error("할 일 데이터를 저장하지 못했습니다.", error);
      showMessage("브라우저 저장소에 저장하지 못했습니다. 이 브라우저에서 데이터가 유지되지 않을 수 있습니다.");
    }
  }

  function getVisibleTodos() {
    if (state.filter === "active") {
      return state.todos.filter((todo) => !todo.completed);
    }
    if (state.filter === "completed") {
      return state.todos.filter((todo) => todo.completed);
    }
    return state.todos;
  }

  function createActionButton(label, action, style, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${style}`;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = text;
    return button;
  }

  function createTodoItem(todo) {
    const item = document.createElement("li");
    item.className = "todo-item flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4";
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mt-1 h-5 w-5 shrink-0 cursor-pointer accent-indigo-600";
    checkbox.dataset.action = "toggle";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `${todo.text} 완료 여부`);
    item.append(checkbox);

    if (state.editingId === todo.id) {
      const editFields = document.createElement("div");
      editFields.className = "todo-edit-fields";

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20";
      editInput.dataset.role = "edit-input";
      editInput.value = todo.text;
      editInput.setAttribute("aria-label", "할 일 내용 수정");

      const editDateInput = document.createElement("input");
      editDateInput.type = "date";
      editDateInput.className = "todo-edit-date";
      editDateInput.dataset.role = "edit-date";
      editDateInput.value = todo.dueDate ?? getLocalDateString(todo.createdAt);
      editDateInput.setAttribute("aria-label", "일정 날짜 수정");
      editFields.append(editInput, editDateInput);
      item.append(editFields);

      const actions = document.createElement("div");
      actions.className = "flex shrink-0 gap-2";
      actions.append(
        createActionButton("수정 저장", "save", "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", "저장"),
        createActionButton("수정 취소", "cancel", "border-slate-300 bg-white text-slate-600 hover:bg-slate-50", "취소")
      );
      item.append(actions);
      return item;
    }

    const content = document.createElement("div");
    content.className = "min-w-0 flex-1";
    const text = document.createElement("span");
    text.className = `todo-text block pt-1 ${todo.completed ? "text-slate-400 line-through" : "text-slate-700"}`;
    text.textContent = todo.text;
    content.append(text);

    const dueDate = todo.dueDate ?? getLocalDateString(todo.createdAt);
    const dateLabel = document.createElement("time");
    dateLabel.className = `task-date ${!todo.completed && dueDate < getLocalDateString() ? "task-date-overdue" : ""}`;
    dateLabel.dateTime = dueDate;
    dateLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(new Date(`${dueDate}T00:00:00`));
    content.append(dateLabel);
    item.append(content);

    const actions = document.createElement("div");
    actions.className = "flex shrink-0 gap-2";
    actions.append(
      createActionButton("할 일 수정", "edit", "border-indigo-600 bg-white text-indigo-700 hover:bg-indigo-50", "수정"),
      createActionButton("할 일 삭제", "delete", "border-rose-300 bg-white text-rose-700 hover:bg-rose-50", "삭제")
    );
    item.append(actions);
    return item;
  }

  function render() {
    const visibleTodos = getVisibleTodos();
    const completedCount = state.todos.filter((todo) => todo.completed).length;
    const remaining = state.todos.length - completedCount;
    const percentage = state.todos.length === 0
      ? 0
      : Math.round((completedCount / state.todos.length) * 100);

    remainingCount.textContent = `남은 할 일 ${remaining}개`;
    totalCount.textContent = String(state.todos.length);
    completedCountLabel.textContent = String(completedCount);
    activeCountLabel.textContent = String(remaining);
    clearCompletedButton.disabled = completedCount === 0;
    progressLabel.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", String(percentage));

    filterControls.querySelectorAll("[data-filter]").forEach((button) => {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle("bg-white", isActive);
      button.classList.toggle("text-indigo-700", isActive);
      button.classList.toggle("shadow-sm", isActive);
      button.classList.toggle("text-slate-600", !isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    list.replaceChildren();
    if (state.todos.length === 0 || visibleTodos.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.className = "rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500";
      emptyMessage.textContent = state.todos.length === 0
        ? "등록된 할 일이 없습니다"
        : "해당 조건의 할 일이 없습니다";
      list.append(emptyMessage);
      return;
    }

    visibleTodos.forEach((todo) => list.append(createTodoItem(todo)));
  }

  function refresh({ persist = true } = {}) {
    render();
    if (persist) saveState();
  }

  function createId() {
    if (typeof window.crypto?.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function focusEditInput(item) {
    const editInput = item?.querySelector('[data-role="edit-input"]');
    if (!editInput) return;
    editInput.focus();
    editInput.select();
  }

  function showFireworks() {
    const fireworks = document.createElement("span");
    fireworks.className = "fireworks";
    fireworks.setAttribute("aria-hidden", "true");

    [25, 50, 75].forEach((position) => {
      const burst = document.createElement("span");
      burst.className = "firework-burst";
      burst.style.left = `${position}%`;
      burst.style.top = "50%";

      for (let index = 0; index < 12; index += 1) {
        const particle = document.createElement("span");
        const angle = (Math.PI * 2 * index) / 12;
        const distance = 24 + Math.random() * 22;
        particle.className = "firework-particle";
        particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
        particle.style.setProperty("--delay", `${Math.random() * 100}ms`);
        particle.style.setProperty("--particle-color", ["#f97316", "#eab308", "#ec4899", "#6366f1"][index % 4]);
        burst.append(particle);
      }
      fireworks.append(burst);
    });

    document.body.append(fireworks);
    window.setTimeout(() => fireworks.remove(), 900);
  }

  function openDeleteDialog(pendingDelete) {
    state.pendingDelete = pendingDelete;
    if (pendingDelete.type === "todo") {
      const todo = state.todos.find((candidate) => candidate.id === pendingDelete.id);
      deleteDialogDescription.textContent = `“${todo.text}” 일정을 삭제할까요? 삭제한 일정은 다시 되돌릴 수 없어요.`;
    } else {
      const completedCount = state.todos.filter((todo) => todo.completed).length;
      deleteDialogDescription.textContent = `완료된 일정 ${completedCount}개를 모두 삭제할까요? 삭제한 일정은 다시 되돌릴 수 없어요.`;
    }
    deleteDialog.showModal();
    cancelDeleteButton.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      showMessage("할 일 내용을 입력해 주세요.");
      input.focus();
      return;
    }

    clearMessage();
    const dueDate = dateInput.value || getLocalDateString();
    state.todos.push({
      id: createId(),
      text,
      completed: false,
      createdAt: Date.now(),
      dueDate
    });
    input.value = "";
    dateInput.value = getLocalDateString();
    state.filter = "all";
    refresh();
    input.focus();
  });

  filterControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button || !filterControls.contains(button) || !FILTERS.has(button.dataset.filter)) return;
    state.filter = button.dataset.filter;
    state.editingId = null;
    refresh();
  });

  list.addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-action="toggle"]');
    if (!checkbox || !list.contains(checkbox)) return;
    const item = checkbox.closest("[data-id]");
    const todo = state.todos.find((candidate) => candidate.id === item?.dataset.id);
    if (!todo) return;
    todo.completed = checkbox.checked;
    refresh();
    if (todo.completed) showFireworks();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || !list.contains(button)) return;
    const item = button.closest("[data-id]");
    const todo = state.todos.find((candidate) => candidate.id === item?.dataset.id);
    if (!todo) return;

    if (button.dataset.action === "edit") {
      state.editingId = todo.id;
      render();
      focusEditInput(Array.from(list.children).find((candidate) => candidate.dataset.id === todo.id));
      return;
    }

    if (button.dataset.action === "cancel") {
      state.editingId = null;
      clearMessage();
      render();
      return;
    }

    if (button.dataset.action === "delete") {
      openDeleteDialog({ type: "todo", id: todo.id });
      return;
    }

    if (button.dataset.action === "save") {
      const editInput = item.querySelector('[data-role="edit-input"]');
      const text = editInput.value.trim();
      if (!text) {
        showMessage("할 일 내용은 비워둘 수 없습니다.");
        editInput.focus();
        return;
      }
      todo.text = text;
      todo.dueDate = item.querySelector('[data-role="edit-date"]').value || getLocalDateString(todo.createdAt);
      state.editingId = null;
      refresh();
    }
  });

  list.addEventListener("keydown", (event) => {
    if (!event.target.matches('[data-role="edit-input"]')) return;
    if (event.key === "Escape") {
      state.editingId = null;
      clearMessage();
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.target.closest("[data-id]")?.querySelector('[data-action="save"]')?.click();
    }
  });

  clearCompletedButton.addEventListener("click", () => {
    openDeleteDialog({ type: "completed" });
  });

  cancelDeleteButton.addEventListener("click", () => {
    deleteDialog.close();
  });

  confirmDeleteButton.addEventListener("click", () => {
    if (!state.pendingDelete) return;
    if (state.pendingDelete.type === "todo") {
      state.todos = state.todos.filter((todo) => todo.id !== state.pendingDelete.id);
    } else {
      state.todos = state.todos.filter((todo) => !todo.completed);
    }
    state.editingId = null;
    state.pendingDelete = null;
    deleteDialog.close();
    refresh();
  });

  deleteDialog.addEventListener("close", () => {
    state.pendingDelete = null;
  });

  dateInput.value = getLocalDateString();
  loadState();
  render();
})();
