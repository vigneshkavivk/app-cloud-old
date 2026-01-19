import React, { useState, useEffect } from "react";
import ConnectSourceCode from "./ConnectSourceCode";  // Your ConnectSourceCode component
import ControlCenter from "./ControlCenter";  // Your ControlCenter component

const ParentComponent = () => {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepository, setSelectedRepository] = useState("");

  return (
    <div>
      <ConnectSourceCode setRepositories={setRepositories} />
      <ControlCenter
        repositories={repositories}
        selectedRepository={selectedRepository}
        setSelectedRepository={setSelectedRepository}
      />
    </div>
  );
};

export default ParentComponent;
