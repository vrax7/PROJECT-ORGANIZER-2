// Get DOM elements
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectList = document.getElementById('project-list');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const totalProjectsElement = document.getElementById('total-projects');
const unfinishedProjectsElement = document.getElementById('unfinished-projects');
const completedProjectsElement = document.getElementById('completed-projects');

// Array to store projects
let projects = [];
let currentProjectIndex = null; // Track the current project index

// History stack to track changes
let historyStack = [];

// Function to save the current state to the history stack
function saveState() {
  historyStack.push(JSON.stringify(projects)); // Save a deep copy of the projects array
  if (historyStack.length > 50) {
    historyStack.shift(); // Limit the history stack to 50 states
  }
}

// Function to undo the last change
function undo() {
  if (historyStack.length > 0) {
    const previousState = historyStack.pop(); // Get the last saved state
    projects = JSON.parse(previousState); // Restore the previous state
    saveProjects(); // Save to localStorage
    renderProjects(); // Re-render the UI
    updateDashboard(); // Update the dashboard
  } else {
    alert("No more changes to undo!");
  }
}

// Add event listener for Ctrl+Z (Windows) or Cmd+Z (Mac)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault(); // Prevent the default behavior (e.g., browser undo)
    undo();
  }
});

// Load projects from localStorage
function loadProjects() {
  const storedProjects = localStorage.getItem('projects');
  if (storedProjects) {
    projects = JSON.parse(storedProjects);
    renderProjects();
    updateDashboard(); // Initialize dashboard stats
  }
}

// Save projects to localStorage
function saveProjects() {
  localStorage.setItem('projects', JSON.stringify(projects));
}

// Function to calculate progress
function calculateProgress(tasks) {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.completed).length;
  return (completedTasks / tasks.length) * 100;
}

// Function to toggle task completion
function toggleTaskCompletion(projectIndex, taskIndex) {
  saveState(); // Save the current state before making changes
  const task = projects[projectIndex].tasks[taskIndex];
  task.completed = !task.completed;
  saveProjects();
  renderProjects();
  updateDashboard(); // Update dashboard stats
}

// Function to check if a task is overdue
function isOverdue(deadline) {
  if (!deadline) return false;
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  return deadline < today;
}

// Function to update progress bar color
function updateProgressBarColor(progressBar, progress) {
  const red = Math.round(255 - (progress / 100) * 255);
  const green = Math.round((progress / 100) * 255);
  progressBar.style.backgroundColor = `rgb(${red}, ${green}, 0)`; // Red to green gradient
}

// Function to render projects to the DOM
function renderProjects(filteredProjects = projects) {
  projectList.innerHTML = ''; // Clear the list
  filteredProjects.forEach((project, index) => {
    const projectElement = document.createElement('div');
    projectElement.classList.add('project');
    projectElement.dataset.projectIndex = index; // Add project index to the element
    const progress = calculateProgress(project.tasks);
    projectElement.innerHTML = `
      <h3>${project.name}</h3>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" style="width: ${progress}%;"></div>
        </div>
        <span class="progress-text">${progress.toFixed(0)}% Completed</span>
      </div>
      <form class="task-form" onsubmit="addTask(event, ${index})">
        <input type="text" placeholder="Add a task" required>
        <input type="date" placeholder="Deadline">
        <button type="submit">Add Task</button>
      </form>
      <ul>
        ${project.tasks.map((task, taskIndex) => `
          <li draggable="true" class="${isOverdue(task.deadline) ? 'overdue' : ''}" data-task-index="${taskIndex}">
            <input type="checkbox" onclick="toggleTaskCompletion(${index}, ${taskIndex})" ${task.completed ? 'checked' : ''}>
            <span class="${task.completed ? 'completed' : ''}">${task.name}</span>
            <span class="deadline">${task.deadline ? `(Due: ${task.deadline})` : ''}</span>
            <button onclick="deleteTask(${index}, ${taskIndex})">Delete</button>
          </li>
        `).join('')}
      </ul>
      <button onclick="deleteProject(${index})">Delete Project</button>
    `;
    projectList.appendChild(projectElement);

    // Update progress bar color
    const progressBar = projectElement.querySelector('.progress');
    updateProgressBarColor(progressBar, progress);
  });
  addDragAndDropListeners(); // Add drag-and-drop listeners
  renderSidebar(); // Update sidebar
}

// Function to render ongoing and completed projects in the sidebar
function renderSidebar() {
  const ongoingList = document.getElementById('ongoing-list');
  const completedList = document.getElementById('completed-list');
  ongoingList.innerHTML = ''; // Clear ongoing list
  completedList.innerHTML = ''; // Clear completed list

  projects.forEach((project, index) => {
    const progress = calculateProgress(project.tasks);
    const projectItem = document.createElement('div');
    projectItem.classList.add('project-item');
    projectItem.innerHTML = `<h3>${project.name}</h3>`;
    projectItem.addEventListener('click', () => loadProjectIntoMainContainer(index));

    if (progress === 100) {
      completedList.appendChild(projectItem); // Add to completed projects
    } else {
      ongoingList.appendChild(projectItem); // Add to ongoing projects
    }
  });
}

// Function to load a project into the main container
function loadProjectIntoMainContainer(index) {
  const project = projects[index];
  const projectElement = document.createElement('div');
  projectElement.classList.add('project');
  projectElement.dataset.projectIndex = index;
  const progress = calculateProgress(project.tasks);
  projectElement.innerHTML = `
    <h3>${project.name}</h3>
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress" style="width: ${progress}%;"></div>
      </div>
      <span class="progress-text">${progress.toFixed(0)}% Completed</span>
    </div>
    <form class="task-form" onsubmit="addTask(event, ${index})">
      <input type="text" placeholder="Add a task" required>
      <input type="date" placeholder="Deadline">
      <button type="submit">Add Task</button>
    </form>
    <ul>
      ${project.tasks.map((task, taskIndex) => `
        <li draggable="true" class="${isOverdue(task.deadline) ? 'overdue' : ''}" data-task-index="${taskIndex}">
          <input type="checkbox" onclick="toggleTaskCompletion(${index}, ${taskIndex})" ${task.completed ? 'checked' : ''}>
          <span class="${task.completed ? 'completed' : ''}">${task.name}</span>
          <span class="deadline">${task.deadline ? `(Due: ${task.deadline})` : ''}</span>
          <button onclick="deleteTask(${index}, ${taskIndex})">Delete</button>
        </li>
      `).join('')}
    </ul>
    <button onclick="deleteProject(${index})">Delete Project</button>
  `;
  projectList.innerHTML = ''; // Clear the main container
  projectList.appendChild(projectElement);

  // Update progress bar color
  const progressBar = projectElement.querySelector('.progress');
  updateProgressBarColor(progressBar, progress);

  addDragAndDropListeners(); // Add drag-and-drop listeners
}

// Add a new project
projectForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent form submission
  const projectName = projectNameInput.value.trim();
  if (projectName) {
    saveState(); // Save the current state before making changes
    projects.push({ name: projectName, tasks: [] });
    projectNameInput.value = ''; // Clear input
    saveProjects();
    renderProjects();
    updateDashboard(); // Update dashboard stats
  }
});

// Delete a project
function deleteProject(index) {
  saveState(); // Save the current state before making changes
  projects.splice(index, 1);
  saveProjects();
  renderProjects();
  updateDashboard(); // Update dashboard stats
}

// Add a task to a project
function addTask(event, projectIndex) {
  event.preventDefault();
  const taskInput = event.target.querySelector('input[type="text"]');
  const deadlineInput = event.target.querySelector('input[type="date"]');
  const taskName = taskInput.value.trim();
  const deadline = deadlineInput.value;
  if (taskName) {
    saveState(); // Save the current state before making changes
    projects[projectIndex].tasks.push({ name: taskName, completed: false, deadline });
    taskInput.value = ''; // Clear input
    deadlineInput.value = ''; // Clear input
    saveProjects();
    renderProjects();
    updateDashboard(); // Update dashboard stats
  }
}

// Delete a task from a project
function deleteTask(projectIndex, taskIndex) {
  saveState(); // Save the current state before making changes
  projects[projectIndex].tasks.splice(taskIndex, 1);
  saveProjects();
  renderProjects();
  updateDashboard(); // Update dashboard stats
}

// Function to filter projects based on search input
function filterProjects(searchTerm) {
  saveState(); // Save the current state before making changes
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderProjects(filteredProjects);
}

// Add event listener for search input
searchButton.addEventListener('click', () => {
  const searchTerm = searchInput.value;
  filterProjects(searchTerm);
});

searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value;
  filterProjects(searchTerm);
});

// Function to update dashboard stats
function updateDashboard() {
  const totalProjects = projects.length;
  const unfinishedProjects = projects.filter(project => calculateProgress(project.tasks) < 100).length;
  const completedProjects = totalProjects - unfinishedProjects;

  totalProjectsElement.textContent = totalProjects;
  unfinishedProjectsElement.textContent = unfinishedProjects;
  completedProjectsElement.textContent = completedProjects;
}

// Load projects when the page loads
loadProjects();

// Export projects as a JSON file
document.getElementById('export-projects').addEventListener('click', () => {
  const data = JSON.stringify(projects, null, 2); // Convert projects to JSON string
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create a temporary link to download the file
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects.json';
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
});

// Import projects from a JSON file
document.getElementById('import-projects').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedProjects = JSON.parse(e.target.result);
        saveState(); // Save the current state before making changes
        projects = importedProjects;
        saveProjects();
        renderProjects();
        updateDashboard(); // Update dashboard stats
        alert('Projects imported successfully!');
      } catch (error) {
        alert('Invalid JSON file. Please upload a valid projects file.');
      }
    };
    reader.readAsText(file);
  }
});

// Initialize particles.js
particlesJS.load('particles-js', 'particles.json', function() {
  console.log('callback - particles.js config loaded');
});

// Drag-and-Drop Functionality
function handleDragStart(e) {
  currentProjectIndex = e.target.closest('.project').dataset.projectIndex; // Track the current project
  e.dataTransfer.setData('text/plain', e.target.dataset.taskIndex); // Store the task index
  e.target.classList.add('dragging'); // Add a class for visual feedback
}

function handleDragEnd(e) {
  const draggingElement = document.querySelector('.dragging');
  if (draggingElement) {
    draggingElement.classList.remove('dragging'); // Remove visual feedback
  }
}

function handleDragOver(e) {
  e.preventDefault(); // Allow dropping
  const draggingElement = document.querySelector('.dragging');
  const closestElement = getClosestElement(e.clientY);
  if (closestElement && draggingElement !== closestElement) {
    const rect = closestElement.getBoundingClientRect();
    const nextPosition = (e.clientY - rect.top) / rect.height > 0.5 ? 'after' : 'before';
    if (nextPosition === 'before') {
      closestElement.parentNode.insertBefore(draggingElement, closestElement);
    } else {
      closestElement.parentNode.insertBefore(draggingElement, closestElement.nextSibling);
    }
  }
}

function handleDrop(e) {
  e.preventDefault();
  const taskIndex = e.dataTransfer.getData('text/plain'); // Get the task index
  const draggingElement = document.querySelector('.dragging');
  draggingElement.classList.remove('dragging'); // Remove visual feedback
  updateTaskOrder(); // Update the task order in the projects array
}

function getClosestElement(y) {
  const draggableElements = [...document.querySelectorAll('li[draggable="true"]:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTaskOrder() {
  saveState(); // Save the current state before making changes
  const tasks = [...document.querySelectorAll('li[draggable="true"]')];
  const newTasks = tasks.map((task) => projects[currentProjectIndex].tasks[task.dataset.taskIndex]);
  projects[currentProjectIndex].tasks = newTasks;
  saveProjects();
}

function addDragAndDropListeners() {
  const tasks = document.querySelectorAll('li[draggable="true"]');
  tasks.forEach((task) => {
    task.addEventListener('dragstart', handleDragStart);
    task.addEventListener('dragover', handleDragOver);
    task.addEventListener('drop', handleDrop);
    task.addEventListener('dragend', handleDragEnd); // Add dragend listener
  });
}

// Function to toggle sidebar visibility and change icons
function toggleSidebar(side) {
  const sidebar = side === 'left' ? document.querySelector('.sidebar') : document.querySelector('.dashboard');
  const toggleButton = sidebar.querySelector('.sidebar-toggle i'); // Get the icon inside the button

  // Toggle the hidden class
  sidebar.classList.toggle('hidden');

  // Change the icon based on the sidebar state
  if (sidebar.classList.contains('hidden')) {
    if (side === 'left') {
      toggleButton.classList.remove('fa-chevron-left');
      toggleButton.classList.add('fa-chevron-right');
    } else {
      toggleButton.classList.remove('fa-chevron-right');
      toggleButton.classList.add('fa-chevron-left');
    }
  } else {
    if (side === 'left') {
      toggleButton.classList.remove('fa-chevron-right');
      toggleButton.classList.add('fa-chevron-left');
    } else {
      toggleButton.classList.remove('fa-chevron-left');
      toggleButton.classList.add('fa-chevron-right');
    }
  }
}

// Function to sort projects
function sortProjects(sortType) {
  saveState(); // Save the current state before making changes
  switch (sortType) {
    case 'a-to-z':
      projects.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'z-to-a':
      projects.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'finished-to-unfinished':
      projects.sort((a, b) => {
        const aProgress = calculateProgress(a.tasks);
        const bProgress = calculateProgress(b.tasks);
        return bProgress - aProgress || a.name.localeCompare(b.name); // Sort by progress, then alphabetically
      });
      break;
    case 'unfinished-to-finished':
      projects.sort((a, b) => {
        const aProgress = calculateProgress(a.tasks);
        const bProgress = calculateProgress(b.tasks);
        return aProgress - bProgress || a.name.localeCompare(b.name); // Sort by progress, then alphabetically
      });
      break;
  }
  saveProjects();
  renderProjects();
}

// Function to toggle projects visibility
function toggleProjectsVisibility() {
  const projectList = document.getElementById('project-list');
  const hideButton = document.getElementById('hide-projects-button');

  if (projectList.style.display === 'none') {
    projectList.style.display = 'block'; // Show projects
    hideButton.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Projects';
  } else {
    projectList.style.display = 'none'; // Hide projects
    hideButton.innerHTML = '<i class="fas fa-eye"></i> Show Projects';
  }
}