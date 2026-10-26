(() => {
  const STORAGE_KEY = "todo-app-state";
  const FILTERS = new Set(["all", "active", "completed"]);
  const state = {
    todos: [],
    filter: "all",
    editingId: null
  };

  const form = document.querySelector("#todo-form");
  const input = document.querySelector("#todo-input");
  const list = document.querySelector("#todo-list");
  const filterControls = document.querySelector("#filter-controls");
  const clearCompletedButton = document.querySelector("#clear-completed");
  const progressBar = document.querySelector("#progress-bar");
  const progressFill = document.querySelector("#progress-fill");
  const progressLabel = document.querySelector("#progress-label");
  const remainingCount = document.querySelector("#remaining-count");
  const appMessage = document.querySelector("#app-message");

  function showMessage(message) {
    appMessage.textContent = message;
    appMessage.classList.remove("d-none");
  }

  function clearMessage() {
    appMessage.textContent = "";
    appMessage.classList.add("d-none");
  }

  function isValidTodo(todo) {
    return todo !== null
      && typeof todo === "object"
      && typeof todo.id === "string"
      && typeof todo.text === "string"
      && todo.text.trim().length > 0
      && typeof todo.completed === "boolean"
      && typeof todo.createdAt === "number"
      && Number.isFinite(todo.createdAt);
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

  function createActionButton(label, action, className, iconText) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm ${className}`;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = iconText;
    return button;
  }

  function createTodoItem(todo) {
    const item = document.createElement("li");
    item.className = "todo-item list-group-item d-flex align-items-start";
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.dataset.action = "toggle";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `${todo.text} 완료 여부`);
    item.append(checkbox);

    if (state.editingId === todo.id) {
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "form-control form-control-sm todo-edit-input";
      editInput.dataset.role = "edit-input";
      editInput.value = todo.text;
      editInput.setAttribute("aria-label", "할 일 내용 수정");
      item.append(editInput);

      const actions = document.createElement("div");
      actions.className = "todo-actions d-flex gap-2";
      actions.append(
        createActionButton("수정 저장", "save", "btn-success", "저장"),
        createActionButton("수정 취소", "cancel", "btn-outline-secondary", "취소")
      );
      item.append(actions);
      return item;
    }

    const text = document.createElement("span");
    text.className = `todo-text flex-grow-1 ${todo.completed ? "is-completed" : ""}`;
    text.textContent = todo.text;
    item.append(text);

    const actions = document.createElement("div");
    actions.className = "todo-actions d-flex gap-2";
    actions.append(
      createActionButton("할 일 수정", "edit", "btn-outline-primary", "수정"),
      createActionButton("할 일 삭제", "delete", "btn-outline-danger", "삭제")
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
    progressLabel.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", String(percentage));

    filterControls.querySelectorAll("[data-filter]").forEach((button) => {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    list.replaceChildren();
    if (state.todos.length === 0 || visibleTodos.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.className = "empty-state list-group-item text-center py-4";
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      showMessage("할 일 내용을 입력해 주세요.");
      input.focus();
      return;
    }

    clearMessage();
    state.todos.push({
      id: createId(),
      text,
      completed: false,
      createdAt: Date.now()
    });
    input.value = "";
    state.filter = "all";
    refresh();
    input.focus();
  });

  filterControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button || !filterControls.contains(button)) return;
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
      render();
      return;
    }

    if (button.dataset.action === "delete") {
      state.todos = state.todos.filter((candidate) => candidate.id !== todo.id);
      state.editingId = null;
      refresh();
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
      state.editingId = null;
      refresh();
    }
  });

  list.addEventListener("keydown", (event) => {
    if (!event.target.matches('[data-role="edit-input"]')) return;
    if (event.key === "Escape") {
      state.editingId = null;
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.target.closest("[data-id]")?.querySelector('[data-action="save"]')?.click();
    }
  });

  clearCompletedButton.addEventListener("click", () => {
    state.todos = state.todos.filter((todo) => !todo.completed);
    state.editingId = null;
    refresh();
  });

  loadState();
  render();
})();
