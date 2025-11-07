import React, { useState } from "react";
// import TerminalComponent from "./Console";

const Executer = () => {
  const [formData, setFormData] = useState({
    detail1: "",
    detail2: "",
    detail3: "",
    detail4: "",
    detail5: "",
  });
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleConsole = () => {
    setIsConsoleOpen(!isConsoleOpen);
  };

  return (
    <div className="w-[85%] relative p-4 space-y-6 flex">
      {/* Form Section */}
      <div className=" bg-white p-6 rounded-lg shadow-md flex-grow">
        <h2 className="text-xl font-semibold mb-4">Form Details</h2>
        <form className="space-y-4">
          <input
            type="text"
            name="detail1"
            value={formData.detail1}
            onChange={handleChange}
            placeholder="Detail 1"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            name="detail2"
            value={formData.detail2}
            onChange={handleChange}
            placeholder="Detail 2"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            name="detail3"
            value={formData.detail3}
            onChange={handleChange}
            placeholder="Detail 3"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            name="detail4"
            value={formData.detail4}
            onChange={handleChange}
            placeholder="Detail 4"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            name="detail5"
            value={formData.detail5}
            onChange={handleChange}
            placeholder="Detail 5"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </form>
      </div>

      {/* Terminal Section */}
      <div className="mt-6 bg-gray-900 text-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold">Terminal</h2>
        <div className="mt-4">
          <p className="font-mono text-sm">Welcome to the terminal</p>
          <p className="font-mono text-sm">Enter command to proceed</p>
        </div>
        <button
          onClick={toggleConsole}
          className="mt-4 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Open Console
        </button>
      </div>

      {/* Sliding Console */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-gray-800 text-white p-6 shadow-lg transition-transform duration-300 ${
          isConsoleOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "90vh" }}  // Increased the height to 500px
      >
        <button
          onClick={toggleConsole}
          className="mb-4 p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
        >
          Close Console
        </button>
        <TerminalComponent />
      </div>
    </div>
  );
};

export default Executer;
