const { default: axios } = require("axios");

exports.fetchRepositories = async (selectedProvider,token) => {

    if (!token) {
        console.log('Please enter a valid token.');
        return;
    }
    
    let url = '';
    const headers = { Authorization: `Bearer ${token}` };

    if (selectedProvider === 'git-hub') {
      url = 'https://api.github.com/user/repos';
    } else if (selectedProvider === 'git-lab') {
      url = 'https://gitlab.com/api/v4/projects';
    } else if (selectedProvider === 'bitbucket') {
      url = 'https://api.bitbucket.org/2.0/repositories';
    }


    try {
      const response = await axios.get(url, { headers });
        console.dirxml(Object.keys(response),"sdsd");
      if (response) {
        let formattedRepos = [];

        if (selectedProvider === 'git-lab') {
          formattedRepos = response.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.path_with_namespace,
            html_url: repo.web_url,
          }));
        } else if (selectedProvider === 'bitbucket') {
          formattedRepos = response.values.map(repo => ({
            id: repo.uuid,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.links.html.href,
          }));
        } else {
          formattedRepos = response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
          }));
        }
        return formattedRepos;
      } else {
        console.log('Failed to fetch repositories. Please check your token.');
        throw new Error("Unable to fetch the repositories. Please check your token.")
    }
} catch (error) {
    console.log('Error fetching repositories. Please try again later.', error);
    throw new Error("Error fetching repositories. Please try again later : ", error.message);
    }
  };