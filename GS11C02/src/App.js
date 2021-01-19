import React, { useEffect, useState } from "react";

import api from './services/api'
import "./styles.css";

function App() {
  const [repositories, setRepositories] = useState([])

  useEffect(() => {
    async function loadRepositories() {
      const response = await api.get('repositories')

      setRepositories(response.data)
    }

    loadRepositories()
  }, [])

  async function handleAddRepository() {
    const repository = {
      title: `GoStack ${Math.random()}`,
      url: "https://github.com/vinifraga/GS11C01",
      techs: ["Node.js", "ReactJS", "React Native"]
    }

    const response = await api.post('repositories', repository)

    setRepositories([...repositories, response.data])
  }

  async function handleRemoveRepository(id) {
    await api.delete(`repositories/${id}`)

    const newRepositories = repositories.filter(repository => repository.id !== id)

    setRepositories(newRepositories)
  }

  return (
    <div>
      <ul data-testid="repository-list">
        {repositories.map(repository => (

          <li key={repository.id}>
            {repository.title}

            <button onClick={() => handleRemoveRepository(repository.id)}>
              Remover
          </button>
          </li>

        ))}
      </ul>
      <button onClick={handleAddRepository}>Adicionar</button>
    </div >
  );
}

export default App;
