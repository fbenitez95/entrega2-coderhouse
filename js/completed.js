document.addEventListener("DOMContentLoaded", () => {
    const ul = document.querySelector(".li-container ul");
    const emptyMsg = document.querySelector(".empty");
    const clearAllBtn = document.getElementById("clear-all-completed");

    let completedTasks = [];



    const loadCompletedTasks = () => {
        const storedTasks = localStorage.getItem('completedTodoTasks');
        completedTasks = storedTasks ? JSON.parse(storedTasks) : [];
        renderCompletedTasks();
    };

    const saveCompletedTasks = () => {
        localStorage.setItem('completedTodoTasks', JSON.stringify(completedTasks));
    };

    const createCompletedTaskElement = (task) => {
        const li = document.createElement("li");
        li.classList.add("completed");

        const span = document.createElement("span");
        span.className = "task-text";
        span.textContent = task.text;

        const completedDate = new Date(task.completedTimestamp).toLocaleDateString();
        const timeSpan = document.createElement("small");
        timeSpan.className = "task-date";
        timeSpan.textContent = `Completada: ${completedDate}`;

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Restaurar";
        restoreBtn.className = "btn-edit";
        restoreBtn.onclick = () => restoreTask(task.id);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Eliminar";
        deleteBtn.className = "btn-delete";
        deleteBtn.onclick = () => deleteTask(task.id);

        li.append(span, timeSpan, restoreBtn, deleteBtn);
        return li;
    };

    const renderCompletedTasks = () => {
        ul.innerHTML = '';
        if (completedTasks.length === 0) {
            emptyMsg.style.display = "block";
        } else {
            emptyMsg.style.display = "none";
            completedTasks.sort((a, b) => b.completedTimestamp - a.completedTimestamp); // Más recientes primero
            completedTasks.forEach(task => ul.appendChild(createCompletedTaskElement(task)));
        }
    };

    const deleteTask = (id) => {
        completedTasks = completedTasks.filter(t => t.id !== id);
        saveCompletedTasks();
        renderCompletedTasks();
    };

    const restoreTask = (id) => {
        const taskToRestore = completedTasks.find(t => t.id === id);
        if (!taskToRestore) return;

        // Cargar tareas pendientes, agregar la restaurada y guardar
        const pendingTasks = JSON.parse(localStorage.getItem('todoTasks') || '[]');
        taskToRestore.isCompleted = false; // Marcar como no completada
        delete taskToRestore.completedTimestamp; // Quitar la fecha de completado
        pendingTasks.push(taskToRestore);
        localStorage.setItem('todoTasks', JSON.stringify(pendingTasks));

        // Eliminar de la lista de completadas y actualizar
        deleteTask(id);
    };

    clearAllBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar permanentemente todas las tareas completadas?')) {
            completedTasks = [];
            saveCompletedTasks();
            renderCompletedTasks();
        }
    });

    loadCompletedTasks();
});