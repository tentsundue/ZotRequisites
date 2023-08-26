document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('entry-data');
  
  form.addEventListener('submit', function(event) {
      event.preventDefault();
      fetchDataFromAPI();
  });
});

function fetchDataFromAPI() {
    const courseNum = document.getElementById('class-id').value;
    const department = document.getElementById('dept-select').value;
    
    // Retrieving the Submit type of the radio input (prereq or prof)
    let submitType = null;
    let radiobtn = document.querySelectorAll('input[name="inlineRadioOptions"]');
    for (i = 0; i < radiobtn.length; i++) {
      if (radiobtn[i].checked) {
        submitType = radiobtn[i];
      }
    }

    console.log("submit Type: ", submitType.value);

    const dept = encodeURIComponent(department)
    let endpoint;
    endpoint = `https://api.peterportal.org/rest/v0/courses/${dept}${courseNum}`;
    fetch(endpoint)
        .then(response => response.json())
        .then(data => {
          if (submitType.value == "prereqs") {
            populateTable(data);
          }
        })
        .catch(error => console.error('Error:', error));
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
function populateTable(data) {
  // const table = document.getElementById('head');
  const tbody = document.getElementById('body');

  // Clearing current contents in the table
  tbody.innerHTML = '';
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
    
      console.log(info[key]);
      row.appendChild(valueCell);

      tbody.appendChild(row);

    })
  )

}





