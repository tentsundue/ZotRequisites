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
    
    console.log(courseNum)
    const dept = encodeURIComponent(department)
    let endpoint;
    endpoint = `https://api.peterportal.org/rest/v0/courses/${dept}${courseNum}`;
    console.group(endpoint)
    fetch(endpoint)
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error fetching data:', error));
}






