import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Slider } from './components/ui/Slider';
import { Textarea } from './components/ui/Textarea';

const MNISTGame = () => {
  const [gameId, setGameId] = useState(null);
  const [turns, setTurns] = useState(0);
  const [finishedGames, setFinishedGames] = useState(0);
  const [imageData, setImageData] = useState([]);
  const [maskMatrix, setMaskMatrix] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null); // For tracking selected pixel
  const [revealedPixels, setRevealedPixels] = useState([]); // New state to track revealed pixels in order
  const [probabilities, setProbabilities] = useState(Array(10).fill(0.1));
  const [thoughtProcess, setThoughtProcess] = useState('');
  const [thoughtTrajectory, setThoughtTrajectory] = useState([]); // New state for storing thought trajectories
  const [probabilityDistributionTrajectory, setProbabilityDistributionTrajectory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // For storing when finished

  useEffect(() => {
    startGame();
  }, []);
  
  const startGame = async () => {
    const userId = localStorage.getItem('userId') || Math.random().toString(36).substring(7);
    localStorage.setItem('userId', userId);
    try {
      const response = await fetch('https://obscure-reaches-09353-943bfda393dc.herokuapp.com/api/start_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
        console.log()

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();

      setGameId(data.game_id);
      setImageData(data.image);
      
      const sideLength = Math.sqrt(data.image.length);
      if (!Number.isInteger(sideLength) || sideLength === 0) {
        throw new Error(`Invalid side length: ${sideLength}`);
      }

      setMaskMatrix(Array(sideLength).fill().map(() => Array(sideLength).fill(true)));
    } catch (error) {
      console.error("Error starting game:", error);
    }
  };

  const handlePixelClick = (row, col) => {
    if (maskMatrix[row][col]) {
      setSelectedPixel({ row, col }); // Mark pixel as selected
    }
  };

  const handleProbabilityChange = (index, event) => {
    const newValue = event.target.value;
    const newProbabilities = [...probabilities];
    newProbabilities[index] = parseFloat(newValue);
    
    const sum = newProbabilities.reduce((a, b) => a + b, 0);
    const normalizedProbabilities = newProbabilities.map(p => p / sum);
    
    setProbabilities(normalizedProbabilities);
  };

  const handleProceed = async () => {
    if (!selectedPixel || thoughtProcess.trim() === '') {
      alert("Please select a pixel and fill in your thought process.");
      return;
    }

    const { row, col } = selectedPixel;

    try {
      const response = await fetch('https://obscure-reaches-09353-943bfda393dc.herokuapp.com/api/record_turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          turn_number: turns + 1,
          pixel_row: row,
          pixel_col: col,
          probability_distribution: probabilities,
          thought_process: thoughtProcess
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Append the current thought process to the thought trajectories
      setThoughtTrajectory([...thoughtTrajectory, thoughtProcess]);
      setProbabilityDistributionTrajectory([...probabilityDistributionTrajectory, [...probabilities]]);
      setRevealedPixels([...revealedPixels, [row, col]]); // Add the newly revealed pixel to the trajectory

      // Reveal the pixel
      const newMask = [...maskMatrix];
      newMask[row][col] = false;
      setMaskMatrix(newMask);

      // Proceed to next step
      setTurns(turns + 1);
      setThoughtProcess(''); // Clear the thought process for the next step
      setSelectedPixel(null); // Reset selected pixel
    } catch (error) {
      console.error("Error proceeding to next step:", error);
    }
  };

  const handleFinishClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const resetGame = () => {
    setThoughtTrajectory([]);
    setProbabilityDistributionTrajectory([]);
    setRevealedPixels([]);
    setProbabilities(Array(10).fill(0.1)); // Reset to uniform distribution
    setTurns(0);
    setThoughtProcess('');
    setSelectedPixel(null);
  };

  const handleFinish = async () => {
    try {
      const response = await fetch('https://obscure-reaches-09353-943bfda393dc.herokuapp.com/api/end_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          final_guess: probabilities.indexOf(Math.max(...probabilities)), // Assuming the final guess is the digit with the highest probability
          num_turns: turns,
          trajectory: revealedPixels,
          thought_trajectory: thoughtTrajectory,
          probability_distribution_trajectory: probabilityDistributionTrajectory
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to end game');
      }
  
      const data = await response.json();
      console.log('Game finished successfully', data);
  
      // Reset state for the next game
      setIsModalOpen(false);
      setFinishedGames(prevFinishedGames => prevFinishedGames + 1);
      resetGame();
      startGame(); // Start the next game      
    } catch (error) {
      console.error("Error finishing game:", error);
    }
  };
  
  const handleSkip = async () => {
    setIsModalOpen(false);
    resetGame();
    startGame();
  };  

  return (
    <div className="p-4 bg-gray-100 text-center">
      {/* Header with Turn Counter */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col items-start">
          <p className="text-lg">Finished games: {finishedGames}</p>
          <p className="text-lg">Turns: {turns}</p>
        </div>
        <h1 className="text-2xl font-bold text-blue-600">Digit-Guessing Game</h1>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleFinishClick}
        >
          Finish
        </button>
      </div>
      <div className="container mx-auto p-4 h-screen flex gap-8">
        
        {/* Left side - Grid and Thought Process */}
        <div className="flex-1 flex flex-col items-center justify-start">
          {/* Instruction Text */}
          <div className="mb-4 w-full text-center">
            <p className="text-lg font-semibold">
              Select the next pixel to reveal, and your detailed reasoning.
            </p>
          </div>

          <div className="flex items-center justify-center mb-4 w-full">
            <div className="grid" style={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.sqrt(imageData.length)}, 1fr)`,
              gap: '1px',
              width: '100%',
              maxWidth: '500px',
              aspectRatio: '1 / 1',
              border: '1px solid black'
            }}>
              {imageData.map((pixel, index) => {
                const row = Math.floor(index / Math.sqrt(imageData.length));
                const col = index % Math.sqrt(imageData.length);
                return (
                  <div
                    key={index}
                    className="cursor-pointer"
                    style={{
                      width: '100%',
                      paddingBottom: '100%',
                      backgroundColor: selectedPixel && selectedPixel.row === row && selectedPixel.col === col
                        ? 'blue' 
                        : maskMatrix[row][col] 
                        ? 'red' 
                        : `rgb(${255 - pixel * 255}, ${255 - pixel * 255}, ${255 - pixel * 255})`
                    }}
                    onClick={() => handlePixelClick(row, col)}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Thought Process - Below the grid */}
          <div className="mt-4 w-full max-w-lg">
            <label className="block mb-2">Thought Process</label>
            <Textarea
              value={thoughtProcess}
              onChange={(e) => setThoughtProcess(e.target.value)}
              placeholder="Explain your reasoning..."
              className="w-full h-32"
            />
          </div>
        </div>

        {/* Right side - Probabilities and Sliders */}
        <div className="flex flex-col flex-1 justify-center">
          {/* Instruction Text */}
          <div className="mb-4 w-full text-center">
            <p className="text-lg font-semibold">
              Update your current probability distribution over the digits.
            </p>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={probabilities.map((p, i) => ({ digit: i, probability: p }))}>
                <XAxis dataKey="digit" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="probability" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-4 max-h-[500px] overflow-y-auto">
              {probabilities.map((p, i) => (
                <div key={i} className="mb-4 flex items-center">
                  <label className="block w-20 text-right pr-4">Digit {i}</label>
                  <Slider
                    value={p}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(e) => handleProbabilityChange(i, e)}
                    className="flex-1 mx-4"
                  />
                  <span className="w-16 text-left">{(p * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>

            {/* Centered Proceed Button */}
            <div className="flex justify-center mt-4">
              <button 
                onClick={handleProceed}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal for Finish/Skip options */}
      <Modal 
        isOpen={isModalOpen} 
        onRequestClose={handleModalClose}
        style={{
          content: {
            width: '400px',
            height: '260px',
            margin: 'auto',
            padding: '20px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }
        }}
      >
        <h2 style={{ marginBottom: '10px' }}>Are you sure?</h2>
        <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
          If you would like to finish generating trajectories because you are certain about the digit, press <strong>Finish</strong>. 
        </p>  
        <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
          If you'd like to skip this image, press <strong>Skip</strong>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          <button 
            onClick={handleFinish} 
            style={buttonStyle}
          >
            Finish
          </button>
          <button 
            onClick={handleSkip} 
            style={buttonStyle}
          >
            Skip
          </button>
          <button 
            onClick={handleModalClose} 
            style={buttonStyle}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

const buttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#007BFF',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
};


export default MNISTGame;
