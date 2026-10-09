document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const todoCount = document.getElementById('todo-count');
    const emptyState = document.getElementById('empty-state');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const STORAGE_KEY = 'vanilla-todos';

    // 1. STATE
    let todos = loadTodos();
    let currentFilter = 'all';
    let draggedId = null;

    // 2. LOAD DATA DARI LOCALSTORAGE
    function loadTodos() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const data = saved ? JSON.parse(saved) : [];

            return Array.isArray(data) ? data.filter(todo =>
                todo &&
                (typeof todo.id === 'string' ||
                    typeof todo.id === 'number') &&
                typeof todo.text === 'string' &&
                typeof todo.completed === 'boolean' &&
                typeof todo.date === 'string'
            ) : [];
        } catch (error) {
            console.error('Gagal membaca todos:', error);
            return [];
        }
    }

    // 3. SIMPAN DATA
    function saveTodos() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(todos)
            );
        } catch (error) {
            console.error('Gagal menyimpan todos:', error);
            alert('Data gagal disimpan di browser.');
        }
    }

    // 4. TAMBAH TODO
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        addTodo();
    });

    function addTodo() {
        const text = input.value.trim();

        if (!text) return;

        const todo = {
            id: crypto.randomUUID(),
            text: text,
            completed: false,
            date: new Date().toISOString()
        };

        todos.unshift(todo);

        saveTodos();
        renderTodos();

        input.value = '';
        input.focus();
    }

    // 5. FILTER TODO
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;

            filterButtons.forEach(btn => {
                btn.classList.toggle(
                    'active',
                    btn === button
                );
            });

            renderTodos();
        });
    });

    function getFilteredTodos() {
        if (currentFilter === 'active') {
            return todos.filter(todo => !todo.completed);
        }

        if (currentFilter === 'completed') {
            return todos.filter(todo => todo.completed);
        }

        return todos;
    }

    // 6. RENDER UI
    function renderTodos() {
        todoList.replaceChildren();

        const filteredTodos = getFilteredTodos();

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.dataset.id = todo.id;
            li.draggable = true;

            if (todo.completed) {
                li.classList.add('is-completed');
            }

            // Drag handle
            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.textContent = '⠿';
            handle.title = 'Geser untuk mengurutkan';
            handle.setAttribute('aria-label', 'Drag todo');

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.completed;
            checkbox.setAttribute(
                'aria-label',
                'Tandai tugas selesai'
            );

            // Text dan tanggal
            const content = document.createElement('div');
            content.className = 'todo-content';

            const text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = todo.text;
            text.title = 'Double-click untuk edit';

            const date = document.createElement('small');
            date.className = 'todo-date';

            const parsedDate = new Date(todo.date);

            date.textContent = Number.isNaN(parsedDate.getTime())
                ? 'Tanggal tidak tersedia'
                : parsedDate.toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            content.append(text, date);

            // Tombol hapus
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Hapus tugas';
            deleteBtn.setAttribute('aria-label', 'Hapus tugas');

            li.append(handle, checkbox, content, deleteBtn);
            todoList.appendChild(li);
        });

        // Counter hanya menghitung tugas yang belum selesai
        const remaining = todos.filter(todo =>
            !todo.completed
        ).length;

        todoCount.textContent = `${remaining} tugas tersisa`;

        // Empty state mengikuti filter yang aktif
        emptyState.style.display =
            filteredTodos.length === 0 ? 'block' : 'none';

        if (todos.length === 0) {
            emptyState.textContent =
                'Belum ada tugas. Yuk, tambahkan tugas pertamamu!';
        } else if (filteredTodos.length === 0) {
            emptyState.textContent =
                currentFilter === 'active'
                    ? 'Semua tugas sudah selesai!'
                    : 'Belum ada tugas yang selesai.';
        }
    }

    // 7. EVENT DELEGATION: CHECKBOX DAN DELETE
    todoList.addEventListener('change', (event) => {
        if (!event.target.matches('.todo-checkbox')) return;

        const li = event.target.closest('.todo-item');
        const todo = todos.find(item =>
            String(item.id) === li.dataset.id
        );

        if (!todo) return;

        todo.completed = event.target.checked;

        saveTodos();
        renderTodos();
    });

    todoList.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-btn');

        if (!deleteBtn) return;

        const li = deleteBtn.closest('.todo-item');

        todos = todos.filter(todo =>
            String(todo.id) !== li.dataset.id
        );

        saveTodos();
        renderTodos();
    });

    // 8. EDIT TODO DENGAN DOUBLE-CLICK
    todoList.addEventListener('dblclick', (event) => {
        const textElement = event.target.closest('.todo-text');

        if (!textElement) return;

        const li = textElement.closest('.todo-item');

        const todo = todos.find(item =>
            String(item.id) === li.dataset.id
        );

        if (!todo) return;

        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = todo.text;
        editInput.setAttribute(
            'aria-label',
            'Edit tugas'
        );

        textElement.replaceWith(editInput);
        editInput.focus();
        editInput.select();

        let finished = false;

        function finishEdit(shouldSave) {
            if (finished) return;
            finished = true;

            const newText = editInput.value.trim();

            if (shouldSave && newText) {
                todo.text = newText;
                saveTodos();
            }

            renderTodos();
        }

        editInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                finishEdit(true);
            }

            if (event.key === 'Escape') {
                finishEdit(false);
            }
        });

        editInput.addEventListener('blur', () => {
            finishEdit(true);
        });
    });

    // 9. DRAG & DROP
    todoList.addEventListener('dragstart', (event) => {
        const li = event.target.closest('.todo-item');

        if (!li) return;

        draggedId = li.dataset.id;
        li.classList.add('dragging');

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draggedId);
        }
    });

    todoList.addEventListener('dragover', (event) => {
        event.preventDefault();

        const target = event.target.closest('.todo-item');

        todoList.querySelectorAll('.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });

        if (target && target.dataset.id !== draggedId) {
            target.classList.add('drag-over');

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }
    });

    todoList.addEventListener('drop', (event) => {
        event.preventDefault();

        const target = event.target.closest('.todo-item');

        if (!draggedId || !target) return;

        const targetId = target.dataset.id;

        if (draggedId === targetId) return;

        const fromIndex = todos.findIndex(todo =>
            String(todo.id) === draggedId
        );

        const toIndex = todos.findIndex(todo =>
            String(todo.id) === targetId
        );

        if (fromIndex === -1 || toIndex === -1) return;

        // Pindahkan todo ke posisi sebelum target
        const [movedTodo] = todos.splice(fromIndex, 1);
        const newTargetIndex = todos.findIndex(todo =>
            String(todo.id) === targetId
        );

        todos.splice(newTargetIndex, 0, movedTodo);

        saveTodos();
        renderTodos();
    });

    todoList.addEventListener('dragend', () => {
        draggedId = null;

        todoList.querySelectorAll(
            '.dragging, .drag-over'
        ).forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
    });

    // 10. TAMPILKAN DATA AWAL
    renderTodos();
});

