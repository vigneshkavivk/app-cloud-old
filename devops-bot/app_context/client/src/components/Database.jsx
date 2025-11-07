import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faCogs } from "@fortawesome/free-solid-svg-icons";

const databases = [
  {
    name: "MongoDB",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-green-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "MongoDB is a NoSQL database known for flexibility and scalability."
  },
  {
    name: "MySQL",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-blue-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "MySQL is an open-source relational database management system."
  },
  {
    name: "PostgreSQL",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-blue-600 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "PostgreSQL is a powerful, open-source object-relational database system."
  },
  {
    name: "InfluxDB",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-blue-300 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "InfluxDB is a time series database optimized for high-write loads."
  },
  {
    name: "VictoriaMetrics",
    icon: <FontAwesomeIcon icon={faCogs} className="text-purple-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "VictoriaMetrics is a fast, cost-effective and scalable time-series database."
  },
  {
    name: "Couchbase",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-red-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "Couchbase is a distributed NoSQL cloud database."
  },
  {
    name: "MariaDB",
    icon: <FontAwesomeIcon icon={faDatabase} className="text-blue-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "MariaDB is a community-developed fork of the MySQL database."
  },
  {
    name: "Liquibase",
    icon: <FontAwesomeIcon icon={faCogs} className="text-orange-400 text-5xl transition-transform duration-300 group-hover:scale-110" />,
    description: "Liquibase is a database schema change management tool."
  }
];

const DatabaseCards = () => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-[#1E2633] text-white flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-extrabold text-[#F26A2E] mb-10 drop-shadow-lg tracking-wide">
        Explore Databases
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full max-w-7xl">
        {databases.map((db, index) => (
          <div
            key={index}
            onClick={() => setSelected(index)}
            className={`bg-white/10 backdrop-blur-md rounded-3xl cursor-pointer shadow-lg border-2 border-transparent
              flex flex-col items-center p-8 text-center transition-all duration-300
              hover:shadow-2xl hover:border-[#F26A2E] hover:bg-white/20 group
              ${selected === index ? "border-[#F26A2E] bg-white/25 shadow-xl" : ""}
            `}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelected(index)}
          >
            <div className="mb-5">
              {db.icon}
            </div>
            <h2 className="text-xl font-semibold text-white group-hover:text-[#F26A2E] transition-colors">
              {db.name}
            </h2>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div
          className="mt-12 bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative border-t-6 border-[#F26A2E]
            text-[#1E2633] animate-fadeIn"
          aria-modal="true"
          role="dialog"
        >
          <h3 className="text-3xl font-bold mb-4 text-[#F26A2E]">{databases[selected].name}</h3>
          <p className="text-lg leading-relaxed">{databases[selected].description}</p>
          <button
            onClick={() => setSelected(null)}
            className="mt-8 px-6 py-3 bg-[#F26A2E] rounded-full font-semibold text-white shadow-md hover:bg-orange-600 hover:shadow-lg transition-all duration-300"
          >
            Close
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {opacity: 0; transform: translateY(20px);}
          to {opacity: 1; transform: translateY(0);}
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease forwards;
        }
      `}</style>
    </div>
  );
};

export default DatabaseCards;
