
import React, { useState } from 'react';
import { ThreeScene } from './components/ThreeScene';

const App: React.FC = () => {
  const [galaxyOrbitSpeedMultiplier, setGalaxyOrbitSpeedMultiplier] = useState(0.03);
  const [armInternalSpeedMultiplier, setArmInternalSpeedMultiplier] = useState(0.03);
  const [galaxySpread, setGalaxySpread] = useState(150); // Universe radius/scatter volume
  const [numGalaxies, setNumGalaxies] = useState(40);
  const [regenerationKey, setRegenerationKey] = useState(0);
  const [disintegrationTriggerKey, setDisintegrationTriggerKey] = useState(0);

  const handleRegenerate = () => {
    setRegenerationKey(prevKey => prevKey + 1);
  };

  const handleDisintegrate = () => {
    setDisintegrationTriggerKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold text-center text-cyan-400">Cosmic Canvas 3D</h1>
      </header>

      <div className="p-3 bg-gray-800/70 backdrop-blur-sm shadow-lg flex flex-wrap justify-center items-center gap-x-4 gap-y-3">
        <div className="flex flex-col items-center min-w-[150px] sm:min-w-[200px]">
          <label htmlFor="galaxyOrbitSpeed" className="text-sm text-cyan-300 mb-1">Galaxy Orbit Speed</label>
          <input
            type="range"
            id="galaxyOrbitSpeed"
            min="0"
            max="0.1"
            step="0.001"
            value={galaxyOrbitSpeedMultiplier}
            onChange={(e) => setGalaxyOrbitSpeedMultiplier(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            aria-label="Global galaxy orbit speed multiplier"
          />
          <span className="text-xs text-gray-400 mt-1 w-16 text-center">{galaxyOrbitSpeedMultiplier.toFixed(3)}</span>
        </div>
        <div className="flex flex-col items-center min-w-[150px] sm:min-w-[200px]">
          <label htmlFor="armInternalSpeed" className="text-sm text-cyan-300 mb-1">Arm Internal Speed</label>
          <input
            type="range"
            id="armInternalSpeed"
            min="0"
            max="0.1"
            step="0.001"
            value={armInternalSpeedMultiplier}
            onChange={(e) => setArmInternalSpeedMultiplier(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            aria-label="Galaxy arm internal rotation speed multiplier"
          />
          <span className="text-xs text-gray-400 mt-1 w-16 text-center">{armInternalSpeedMultiplier.toFixed(3)}</span>
        </div>
        <div className="flex flex-col items-center min-w-[150px] sm:min-w-[200px]">
          <label htmlFor="galaxySpread" className="text-sm text-cyan-300 mb-1">Universe Spread</label>
          <input
            type="range"
            id="galaxySpread"
            min="50"
            max="300"
            step="10"
            value={galaxySpread}
            onChange={(e) => setGalaxySpread(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            aria-label="Universe spread radius"
          />
          <span className="text-xs text-gray-400 mt-1 w-16 text-center">{galaxySpread.toFixed(0)}</span>
        </div>
        <div className="flex flex-col items-center min-w-[150px] sm:min-w-[200px]">
          <label htmlFor="numGalaxies" className="text-sm text-cyan-300 mb-1">Number of Galaxies</label>
          <input
            type="range"
            id="numGalaxies"
            min="5"
            max="100"
            step="1"
            value={numGalaxies}
            onChange={(e) => {
              setNumGalaxies(parseInt(e.target.value));
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            aria-label="Number of galaxies"
          />
          <span className="text-xs text-gray-400 mt-1 w-16 text-center">{numGalaxies}</span>
        </div>
        <button
          onClick={handleRegenerate}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out self-center text-sm"
          aria-label="Re-generate all galaxies with new random properties"
        >
          Re-generate Galaxies
        </button>
         <button
          onClick={handleDisintegrate}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out self-center text-sm"
          aria-label="Disintegrate all galaxies towards the camera"
        >
          Disintegrate Universe
        </button>
      </div>

      <main className="flex-grow relative">
        <ThreeScene
          galaxyOrbitSpeedMultiplier={galaxyOrbitSpeedMultiplier}
          armInternalSpeedMultiplier={armInternalSpeedMultiplier}
          galaxySpread={galaxySpread}
          numGalaxies={numGalaxies}
          regenerationKey={regenerationKey}
          disintegrationTriggerKey={disintegrationTriggerKey}
        />
      </main>
      <footer className="p-2 bg-gray-800 text-center text-sm text-gray-400">
        <p>Drag to navigate. Adjust properties. Re-generate or Disintegrate the universe!</p>
      </footer>
    </div>
  );
};

export default App;
    