document.addEventListener("DOMContentLoaded", () => {
    
    // --- Mapeo para el ordenamiento de prioridad (Alta = 3, Media = 2, Baja = 1) ---
    const PRIORITY_ORDER = {
        'high': 3,
        'medium': 2,
        'low': 1
    };

    // --- 1. Selección de Elementos del DOM ---
    const form = document.querySelector("form");
    const input = form ? form.querySelector("#task-input") : null;
    const priorityInput = document.getElementById("task-priority");
    const dueDateInput = document.getElementById("due-date-input"); // 🆕 Nuevo: Input de fecha
    const ul = document.querySelector(".li-container ul");
    const emptyMsg = document.querySelector(".empty p");
    const sortOldestBtn = document.getElementById("sort-oldest");
    const sortNewestBtn = document.getElementById("sort-newest");
    const sortPriorityBtn = document.getElementById("sort-priority");
    const sortDueDateBtn = document.getElementById("sort-due-date"); // 🆕 Nuevo: Botón de ordenar por fecha
    const pendingCounter = document.getElementById("pending-count");
    const completedCounter = document.getElementById("completed-count");
    const clearAllBtn = document.getElementById("clear-all-completed"); // 🆕 Botón de limpiar historial
    
    // Elementos del Calendario
    const calendarDays = document.getElementById("calendar-days");
    const currentMonthYearSpan = document.getElementById("current-month-year");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    
    // NUEVO: Elemento del interruptor de tema
    const themeToggle = document.getElementById("theme-toggle");

    // Array principal que guarda todas las tareas
    let tasks = [];
    let completedTasks = []; // Nuevo array para tareas completadas
    let currentCalendarDate = new Date(); // Estado para el calendario

    // --- 2. Funciones de Persistencia (Local Storage) ---

    const saveTasks = () => {
        localStorage.setItem('todoTasks', JSON.stringify(tasks));
        localStorage.setItem('completedTodoTasks', JSON.stringify(completedTasks));
        if (form) renderCalendar(currentCalendarDate); // Solo renderiza calendario si existe (Main Page)
    };

    const loadTasks = () => {
        const storedTasks = localStorage.getItem('todoTasks');
        const storedCompletedTasks = localStorage.getItem('completedTodoTasks');

        if (storedCompletedTasks) completedTasks = JSON.parse(storedCompletedTasks);

        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            // Asegurarse de que las tareas antiguas tengan 'priority' y 'dueDate'
             tasks = tasks.map(task => ({
                ...task,
                priority: task.priority || 'medium', // Default a medium
                notes: task.notes || '',
                dueDate: task.dueDate || null // 🆕 Default a null
            }));
        }

        // Lógica de renderizado según la página
        if (form) {
            renderTasks(); 
            renderCalendar(currentCalendarDate);
        }
        if (clearAllBtn) renderCompletedTasks(); // 🆕 Renderiza completadas si estamos en esa página
    };

    // --- 3. Funciones de Utilidad y Contadores ---

    const updateStatus = () => {
        const pending = tasks.length; // Ahora 'tasks' solo tiene pendientes
        const completed = completedTasks.length;

        if (pendingCounter) pendingCounter.textContent = pending;
        if (completedCounter) completedCounter.textContent = completed;

        emptyMsg.parentElement.style.display = tasks.length ? "none" : "block";

        saveTasks();
    };
    
    // Función de comparación para fechas de vencimiento (nulos al final)
    const compareDueDates = (a, b, order = "asc") => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        
        if (dateA === Infinity && dateB === Infinity) return 0;
        if (dateA === Infinity) return 1; // nulos al final
        if (dateB === Infinity) return -1; // nulos al final

        return order === "asc" ? dateA - dateB : dateB - dateA;
    }

    // Ordenar por fecha de creación (asc/desc)
    const sortTasks = (order = "desc") => {
        tasks.sort((a, b) =>
            order === "asc"
                ? a.timestamp - b.timestamp
                : b.timestamp - a.timestamp
        );
        renderTasks();
    };
    
    // Ordenar por prioridad (alta a baja)
    const sortTasksByPriority = () => {
        tasks.sort((a, b) => {
            const priorityComparison = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
            if (priorityComparison !== 0) return priorityComparison;
            return b.timestamp - a.timestamp; // Desempate: más reciente
        });
        renderTasks();
    };
    
    // 🆕 Ordenar por fecha de vencimiento
    const sortTasksByDueDate = () => {
        tasks.sort((a, b) => {
            // Tareas no completadas van primero, luego completadas.
            if (!a.isCompleted && b.isCompleted) return -1;
            if (a.isCompleted && !b.isCompleted) return 1;
            
            // Dentro de cada grupo, ordena por fecha de vencimiento (más cercana/antigua primero)
            const dueDateComparison = compareDueDates(a, b, "asc");
            if (dueDateComparison !== 0) return dueDateComparison;
            
            return b.timestamp - a.timestamp; // Desempate final: más reciente
        });
        renderTasks();
    };

    // Función para obtener la fecha de hoy en formato YYYY-MM-DD
    const getTodayDateString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // --- 4. Renderización y Creación de Elementos ---

    const createTaskElement = (task) => {
        const li = document.createElement("li");
        li.dataset.timestamp = task.timestamp;
        li.dataset.id = task.id;
        li.dataset.dueDate = task.dueDate || ''; // Agregamos data-dueDate
        
        if (task.isCompleted) li.classList.add("completed");
        
        // Comprobar si está vencida y no completada
        const todayStr = getTodayDateString();
        if (task.dueDate && !task.isCompleted && task.dueDate < todayStr) {
             li.classList.add("overdue");
        }
        
        li.classList.add(`priority-${task.priority}`);
        
        // Checkbox, Etiqueta de Prioridad y Texto se mantienen igual...
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.isCompleted;
        checkbox.className = "task-checkbox";
        
        const prioritySpan = document.createElement("span");
        const displayPriority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        prioritySpan.textContent = `[${displayPriority}]`;
        prioritySpan.className = "task-priority-label";

        // 🆕 Etiqueta de Fecha de Vencimiento
        const dueDateSpan = document.createElement("span");
        if (task.dueDate) {
            // Formato de fecha corto (ej: 01/Nov)
            const dateParts = task.dueDate.split('-'); // YYYY-MM-DD
            const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
            dueDateSpan.textContent = `Vence: ${formattedDate}`; 
            dueDateSpan.className = "task-due-date";
        }
        
        const span = document.createElement("span");
        span.textContent = task.text;
        span.className = "task-text";

        const timeSpan = document.createElement("small");
        timeSpan.textContent = new Date(task.timestamp).toLocaleString().split(',')[0]; // Solo fecha de creación
        timeSpan.className = "task-date";

        const delBtn = document.createElement("button");
        delBtn.textContent = "Eliminar";
        delBtn.className = "btn-delete";
        delBtn.onclick = () => deleteTask(task.id);

        const editBtn = document.createElement("button");
        editBtn.textContent = "Editar";
        editBtn.className = "btn-edit";
        editBtn.onclick = () => editTask(task.id, span);

        const noteBtn = document.createElement("button");
        noteBtn.textContent = task.notes ? "Ver Nota" : "Añadir Nota";
        noteBtn.className = "btn-note";
        noteBtn.onclick = () => handleNote(task.id, noteBtn);

        // Ensambla el <li> (agregamos dueDateSpan)
        li.append(checkbox, prioritySpan, dueDateSpan.textContent ? dueDateSpan : '', span, timeSpan, editBtn, noteBtn, delBtn);
        return li;
    };
    
    // Vuelve a dibujar toda la lista
    const renderTasks = (filterDate = null) => {
        ul.innerHTML = '';
        let tasksToRender = tasks;
        
        // Filtra si se proporciona una fecha
        if (filterDate) {
            const dateStr = filterDate.toISOString().split('T')[0];
            tasksToRender = tasks.filter(t => t.dueDate === dateStr);
            emptyMsg.parentElement.style.display = tasksToRender.length ? "none" : "block";
            if (tasksToRender.length === 0) {
                 emptyMsg.textContent = `No hay tareas para el ${filterDate.toLocaleDateString()}`;
            } else {
                 emptyMsg.parentElement.style.display = "none";
            }
        } else {
            // Si no hay filtro, usa la lógica normal
             emptyMsg.parentElement.style.display = tasks.length ? "none" : "block";
             emptyMsg.textContent = "No tienes tareas pendientes";
        }

        tasksToRender.forEach(task => ul.appendChild(createTaskElement(task)));
        updateStatus();
    };

    // --- 🆕 FUNCIONES PARA LA PÁGINA DE COMPLETADAS ---

    const createCompletedTaskElement = (task) => {
        const li = document.createElement("li");
        li.classList.add("completed");

        const span = document.createElement("span");
        span.className = "task-text";
        span.textContent = task.text;

        const timeSpan = document.createElement("small");
        timeSpan.className = "task-date";
        const completedDate = task.completedTimestamp ? new Date(task.completedTimestamp).toLocaleDateString() : '---';
        timeSpan.textContent = `Completada: ${completedDate}`;

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Restaurar";
        restoreBtn.className = "btn-edit"; // Usamos estilo de editar (azul/naranja)
        restoreBtn.onclick = () => restoreTask(task.id);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Eliminar";
        deleteBtn.className = "btn-delete";
        deleteBtn.onclick = () => deleteCompletedTask(task.id);

        li.append(span, timeSpan, restoreBtn, deleteBtn);
        return li;
    };

    const renderCompletedTasks = () => {
        ul.innerHTML = '';
        if (completedTasks.length === 0) {
            emptyMsg.parentElement.style.display = "block"; // Reutilizamos el contenedor empty
            emptyMsg.textContent = "Aún no has completado ninguna tarea.";
        } else {
            emptyMsg.parentElement.style.display = "none";
            completedTasks.sort((a, b) => b.completedTimestamp - a.completedTimestamp);
            completedTasks.forEach(task => ul.appendChild(createCompletedTaskElement(task)));
        }
    };

    // --- 5. Funciones de Manipulación de Tareas ---

    // Función addTask recibe la fecha de vencimiento
    const addTask = (text, priority, dueDate) => {
        const now = new Date().getTime();
        const newTask = {
            id: now,
            text: text,
            timestamp: now,
            isCompleted: false,
            notes: "",
            priority: priority,
            dueDate: dueDate || null // Guarda la fecha de vencimiento o null
        };
        tasks.push(newTask);
        sortTasks("desc"); // Por defecto ordena por más reciente
    };

    const deleteTask = (id) => { // Eliminar tarea pendiente
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
    };

    const toggleCompleted = (id) => {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        // Mover la tarea de 'tasks' a 'completedTasks'
        const [completedTask] = tasks.splice(taskIndex, 1);
        completedTask.isCompleted = true;
        completedTask.completedTimestamp = new Date().getTime(); // Guardar fecha de completado
        completedTasks.push(completedTask);

        renderTasks(); // Re-renderiza la lista de pendientes
    };

    const deleteCompletedTask = (id) => { // 🆕 Eliminar tarea completada permanentemente
        completedTasks = completedTasks.filter(t => t.id !== id);
        saveTasks(); // Guarda ambos arrays
        renderCompletedTasks();
    };

    const restoreTask = (id) => { // 🆕 Restaurar tarea a pendientes
        const taskIndex = completedTasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const [taskToRestore] = completedTasks.splice(taskIndex, 1);
        taskToRestore.isCompleted = false;
        delete taskToRestore.completedTimestamp;
        tasks.push(taskToRestore);
        
        saveTasks();
        renderCompletedTasks(); // Actualiza la vista actual
    };
    
    // Edita la tarea (texto, prioridad, y fecha)
    const editTask = (id, textSpan) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const newText = prompt("Edita tu tarea:", task.text);

        if (newText !== null && newText.trim() !== "") {
            task.text = newText.trim();
            
            // Opcional: Preguntar por la nueva fecha/prioridad
            const newDueDate = prompt(`Editar fecha de vencimiento (YYYY-MM-DD):`, task.dueDate || "");
            if (newDueDate !== null) {
                 task.dueDate = newDueDate.trim() || null;
            }

            // Aquí podrías agregar un prompt para la prioridad si quieres
            
            renderTasks(); // Re-renderizar para actualizar clases de vencimiento/fecha
        }
    };

    const handleNote = (id, button) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const initialNote = task.notes || "Añade una nota...";
        const note = prompt("Añade o edita tu nota:", initialNote);
        
        if (note !== null) {
            const finalNote = note.trim() === "Añade una nota..." ? "" : note.trim();
            task.notes = finalNote;
            button.textContent = task.notes ? "Ver Nota" : "Añadir Nota";
            updateStatus(); 
            
            if (task.notes && note === task.notes) {
                // No hacer nada si no hay cambio
            } else if (task.notes && finalNote !== "") {
                 alert("Nota actualizada: " + task.notes);
            }
        }
    };
    
    // --- 6. Funciones del Calendario Simple ---
    
    const getTasksByDate = () => {
        const map = new Map();
        tasks.forEach(task => {
            if (task.dueDate && !task.isCompleted) {
                if (!map.has(task.dueDate)) {
                    map.set(task.dueDate, []);
                }
                map.get(task.dueDate).push(task);
            }
        });
        return map;
    };
    
    const renderCalendar = (date) => {
        calendarDays.innerHTML = '';
        const tasksByDate = getTasksByDate();
        const todayStr = getTodayDateString();
        
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Dom, 1=Lun...
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Ajustamos para que la semana empiece en Lunes (0=Dom, 1=Lun... 6=Sab)
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

        // Encabezados de días
        const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendarDays.appendChild(header);
        });

        // Días vacíos al inicio (para alinear el primer día)
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty-day';
            calendarDays.appendChild(emptyDay);
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayEl.dataset.date = dayStr;
            
            // Marca el día actual
            if (dayStr === todayStr) {
                dayEl.classList.add('today');
            }
            
            // Si hay tareas para este día, añade el indicador
            if (tasksByDate.has(dayStr)) {
                const indicator = document.createElement('span');
                indicator.className = 'task-indicator';
                dayEl.appendChild(indicator);
            }
            
            // Evento para filtrar tareas al hacer click
            dayEl.addEventListener('click', (e) => {
                // Convertir la fecha del dataset a un objeto Date
                const filterDate = new Date(e.currentTarget.dataset.date + 'T00:00:00'); 
                renderTasks(filterDate);
                // Opcional: Desplazarse a la lista de tareas
                document.querySelector('.li-container').scrollIntoView({ behavior: 'smooth' });
            });

            calendarDays.appendChild(dayEl);
        }
        
        // Actualiza el mes/año
        currentMonthYearSpan.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const changeMonth = (offset) => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
        renderCalendar(currentCalendarDate);
    };

    // --- NUEVO: Funciones para el cambio de tema ---
    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.checked = true;
        } else {
            document.body.classList.remove('light-mode');
            themeToggle.checked = false;
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark'; // Oscuro por defecto
        applyTheme(savedTheme);
    };

    // --- 7. Funciones de Widgets Externos (API) ---
    
    // (Mantengo las funciones de API tal como estaban para Dólar y Clima)

    const fetchDollarPrice = () => {
        const dollarElement = document.getElementById('dollar-price');
        const DOLLAR_API_URL = 'https://dolarapi.com/v1/dolares/blue'; 
        
        fetch(DOLLAR_API_URL)
            .then(response => {
                if (!response.ok) throw new Error('API del dólar no disponible. Estado: ' + response.status);
                return response.json();
            })
            .then(data => {
                const ventaPrice = data.venta;
                const compraPrice = data.compra;
                
                if (ventaPrice && compraPrice) {
                    dollarElement.innerHTML = `V: $${ventaPrice} / C: $${compraPrice}`;
                } else {
                    throw new Error('Datos de Venta/Compra no encontrados.');
                }
            })
            .catch(error => {
                console.error("Error al obtener el dólar:", error);
                dollarElement.textContent = 'Error al cargar Dólar 😥';
            });
    };

    const fetchWeather = (lat, lon) => {
        const weatherElement = document.getElementById('weather-info');
        const API_KEY = 'c9678e4abc03f12d76ef325596223292'; 
        const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;

        fetch(WEATHER_API_URL)
            .then(response => {
                if (!response.ok) throw new Error('API del clima falló. Código: ' + response.status);
                return response.json();
            })
            .then(data => {
                const temp = data.main.temp.toFixed(0);
                const desc = data.weather[0].description;
                const city = data.name;
                
                weatherElement.innerHTML = `${temp}°C en ${city} (${desc})`;
            })
            .catch(error => {
                console.error("Error al obtener el clima:", error);
                weatherElement.textContent = 'Error: Clave inválida, no activada o ubicación denegada 😥';
            });
    };
    
    const loadExternalData = () => {
        fetchDollarPrice();
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    document.getElementById('weather-info').textContent = 'Permite ubicación para el clima.';
                }
            );
        } else {
            document.getElementById('weather-info').textContent = 'Geolocalización no soportada.';
        }
    };


    // --- 8. Event Listeners e Inicialización ---

    if (form) {
        form.addEventListener("submit", e => {
            e.preventDefault();
            const text = input.value.trim();
            const priority = priorityInput.value;
            const dueDate = dueDateInput.value; // 🆕 Obtiene la fecha

            if (!text) return;

            addTask(text, priority, dueDate); // 🆕 Pasa la fecha
            input.value = "";
            dueDateInput.value = ""; // Limpia la fecha después de agregar
            input.focus();
        });
    }

    ul.addEventListener('change', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const li = e.target.closest('li');
            const taskId = parseInt(li.dataset.id);
            toggleCompleted(taskId);
        }
    });

    if (sortOldestBtn) sortOldestBtn.addEventListener("click", () => sortTasks("asc"));
    if (sortNewestBtn) sortNewestBtn.addEventListener("click", () => sortTasks("desc"));
    if (sortPriorityBtn) sortPriorityBtn.addEventListener("click", sortTasksByPriority);
    if (sortDueDateBtn) sortDueDateBtn.addEventListener("click", sortTasksByDueDate); // 🆕 Evento para ordenar por fecha de vencimiento
    
    // Eventos del Calendario
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // 🆕 Evento para limpiar historial (Solo en página completed)
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar permanentemente todas las tareas completadas?')) {
                completedTasks = [];
                saveTasks();
                renderCompletedTasks();
            }
        });
    }

    // NUEVO: Evento para el interruptor de tema
    themeToggle.addEventListener('change', toggleTheme);

    // Inicialización
    loadTheme(); // Carga el tema guardado
    loadTasks(); // 🆕 Carga datos siempre, la función decide qué renderizar
    loadExternalData();
});