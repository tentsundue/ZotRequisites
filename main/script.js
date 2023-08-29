document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('entry-data');
  
  form.addEventListener('submit', function(event) {
      event.preventDefault();
      fetchDataFromAPI();
  });
});

function fetchDataFromAPI() {
    const courseNum = document.getElementById('class-id').value;
    let department = document.getElementById('dept-select').value;
    
    // Retrieving the Submit type of the radio input (prereq or prof)
    let submitType = null;
    let radiobtn = document.querySelectorAll('input[name="inlineRadioOptions"]');
    for (i = 0; i < radiobtn.length; i++) {
      if (radiobtn[i].checked) {
        submitType = radiobtn[i];
      }
    }

    console.log("submit Type: ", submitType.value);

    let endpoint;
    if (submitType.value == 'prereqs') {
      department = department.replace(/\s+/g, ''); // Clearing whitespace
      const dept = encodeURIComponent(department)
      endpoint = `https://api.peterportal.org/rest/v0/courses/${dept}${courseNum}`;
      fetch(endpoint)
        .then(response => response.json())
        .then(data => {
          populateTablePrerequsite(data);
        })
          .catch(error => console.error('Error:', error));
    } else {
      const sortingContainer = document.getElementById('sortingChoices');
      sortingContainer.innerHTML = '';

      const dept = encodeURIComponent(department)
      if (courseNum.length > 0) {
        endpoint = `https://api.peterportal.org/rest/v0/grades/raw?&department=${dept}&number=${courseNum}`;
        console.log(endpoint);
        fetch(endpoint)
        .then(response => response.json())
        .then(data => {
          populateTableProfessor(data);
        })
          .catch(error => console.error('Error:', error));
      }
     
    }
    
}

function retrieveTableInfo(data) {
    // Extracting prerequisites
    let prereqs = data.prerequisite_text;
    if (prereqs == "") {
      prereqs = "NONE";
    }
    // Extracting what courses require the given course as a prequisite
    let prereqs_for = data.prerequisite_for;
    if (prereqs_for == "") {
      prereqs_for = "NONE";
    }
    // Extracting corequisites
    let coreqs = data.corequisite;
    if (coreqs == "") {
      coreqs = "NONE";
    }
    // Extracting last three quarters offered
    let terms_offered = data.terms.slice(-3);
    if (terms_offered.length == 0) {
      terms_offered = "This class may not exist anymore. Please refer to official UCI resources for its availability"
    } 
    // Retrieving UCINetIDs of professors who have taught this class
    let professors = [];
    let profNetID = data.professor_history;
    if (profNetID == "") {
      professors = "Weird..No professors have taught this class."
    }
    let fetchPromises = profNetID.map(async (prof) => {
      try {
        let response = await fetch(`https://api.peterportal.org/rest/v0/instructors/${prof}`);
        let data = await response.json();
        return data.name;
      } catch (error) {
        console.error("Error occured with retrieving prof info: ", error);
      }

    });

    return new Promise((resolve) => {
      Promise.all(fetchPromises).then(results => {
        professors = [...professors, ...results];  // This will contain all the professor names
        let info = {
          'Prerequisites': prereqs,
          'Prerequisites For': prereqs_for,
          'Corequisites': coreqs,
          'Last 3 Terms Offered': terms_offered,
          'Professors': professors
        };
        resolve(info);
      })
    })
  
}
function populateTablePrerequsite(data) {
  const sortingContainer = document.getElementById('sortingChoices');
  sortingContainer.innerHTML = '';

  const table = document.getElementById('head');
  const tbody = document.getElementById('body');

  // Clearing current contents in the table
  tbody.innerHTML = '';
  table.innerHTML = '';
  retrieveTableInfo(data).then(info =>

    // Loop through each key of the info object
    Object.keys(info).forEach(key => {
      const row = document.createElement('tr');
  
      // Create a cell for the key (e.g., 'prereqs', 'coreqs', ...)
      const keyCell = document.createElement('th');
      keyCell.textContent = key;
      row.appendChild(keyCell);

      // Create a cell for the value associated with the key
      const valueCell = document.createElement('td');
      if (Array.isArray(info[key]) && info[key].length > 0) {
        const list = document.createElement('ul');
        info[key].forEach(item => {
            const bulletpt = document.createElement('li');
            bulletpt.textContent = item;
            list.appendChild(bulletpt);
        });
        valueCell.appendChild(list);
      } else {
        valueCell.textContent = info[key];
      }
    
      row.appendChild(valueCell);

      tbody.appendChild(row);

    })
  )
}
function getProfInfo(data) {
  profInfo = {}; // Professor as the key, and list containing [Passing Rate, GPA, and # of classes taught] as the value
  data.forEach(course => {
    let total = course.gradeACount + course.gradeBCount + course.gradeCCount + course.gradeDCount + course.gradeFCount + course.gradePCount + course.gradeNPCount;
    let passingRate = (course.gradeACount + course.gradeBCount + course.gradeCCount + course.gradePCount) / total;
    if (course.instructor in profInfo) {
      profInfo[course.instructor][0] += passingRate;
      profInfo[course.instructor][1] += course.averageGPA;
      profInfo[course.instructor][2] += 1;
    } else {
      profInfo[course.instructor] = [passingRate, course.averageGPA, 1];
    }
  })
  return profInfo;
}

function sorting(profInfo) {
  // Sorting input Creation
  const sortInput = document.createElement('select');
  sortInput.setAttribute('id', 'sortingInput');
  sortInput.setAttribute('class', 'form-select');
  
  const defaultOption = document.createElement('option');
  defaultOption.textContent = 'Sort';

  const sortByGPA = document.createElement('option')
  sortByGPA.value = 'sortByGPA';
  sortByGPA.textContent = 'By GPA'

  const sortByPass = document.createElement('option');
  sortByPass.value = 'sortByPass';
  sortByPass.textContent = 'By Passing Rate';

  const sortByTaught = document.createElement('option');
  sortByTaught.value = 'sortByTaught';
  sortByTaught.textContent = 'By Times Taught (Recently)';
  
  sortInput.appendChild(defaultOption);
  sortInput.appendChild(sortByGPA);
  sortInput.appendChild(sortByPass);
  sortInput.appendChild(sortByTaught);

  sortingChoices = document.getElementById('sortingChoices');
  sortingChoices.appendChild(sortInput);

  // Sorting Functionality
  document.getElementById('sortingInput').addEventListener('change', function() {
    const selected = this.value;

    if (selected === 'sortByPass') {
      // Converting into an array of [key, value] pairs
      profInfo = Object.entries(profInfo)
      .sort((a, b) => (b[1][0] / b[1][2]) - (a[1][0] / a[1][2])) // Sorting based on the first element in the list
      .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
      }, {});
    } else if (selected == 'sortByGPA') {
      profInfo = Object.entries(profInfo)
      .sort((a, b) => (b[1][1] / b[1][2]) - (a[1][1] / a[1][2])) // Sorting based on the first element in the list
      .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
      }, {});
    } else if (selected == 'sortByTaught') {
      profInfo = Object.entries(profInfo)
      .sort((a, b) => b[1][2] - a[1][2]) // Sorting based on the first element in the list
      .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
      }, {});
    }
    updateTable(profInfo);
  })
}

function updateTable(profInfo) {
  console.log(profInfo);
  const tbody = document.getElementById('body');
  tbody.innerHTML = '';

  Object.entries(profInfo).forEach(([prof, info]) => {
    rowBody = document.createElement('tr');

    professor = document.createElement('td');
    professor.textContent = prof;
    
    grades = document.createElement('td');
    grades.textContent = (info[1] / info[2]).toFixed(2);
    
    passingRate = document.createElement('td');
    passingRate.textContent = `${(info[0] / info[2]).toFixed(2) * 100}%`;

    totalTimesTaught = document.createElement('td');
    totalTimesTaught.textContent = info[2];

    rowBody.appendChild(professor);
    rowBody.appendChild(grades);
    rowBody.appendChild(passingRate);
    rowBody.appendChild(totalTimesTaught);
    tbody.appendChild(rowBody);
  })
}
function populateTableProfessor(data) {
    profInfo = getProfInfo(data);
    sorting(profInfo);
    // console.log(profInfo);

    const table = document.getElementById('head');
    sortingChoices = document.getElementById('sortingChoices');
   
    // Clearing current contents in the table
    table.innerHTML = '';

    // Header Content
    const rowHeader = document.createElement('tr');
    
    const profHeader = document.createElement('th');
    profHeader.setAttribute('data-column', 'prof')
    profHeader.textContent = 'Professor';
    
    const gradesHeader = document.createElement('th');
    gradesHeader.setAttribute('data-column', 'avgGPA')
    gradesHeader.textContent = 'Grades';

    const passingRateHeader = document.createElement('th');
    passingRateHeader.setAttribute('data-column','passing')
    passingRateHeader.textContent = 'Passing Rate';

    const totalTimesTaughtHeader = document.createElement('th');
    totalTimesTaughtHeader.setAttribute('data-column', 'timesTaught')
    totalTimesTaughtHeader.textContent = 'Total Times Taught';

    rowHeader.appendChild(profHeader);
    rowHeader.appendChild(gradesHeader);
    rowHeader.appendChild(passingRateHeader);
    rowHeader.appendChild(totalTimesTaughtHeader);
    table.appendChild(rowHeader);

    // Body Content
    updateTable(profInfo);


};




