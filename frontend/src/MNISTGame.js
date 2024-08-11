import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Slider } from './components/ui/Slider';
import { Textarea } from './components/ui/Textarea';

const MNISTGame = () => {
  const [turns, setTurns] = useState(0);
  const [maskMatrix, setMaskMatrix] = useState([]);
  const [probabilities, setProbabilities] = useState(Array(10).fill(0.1));
  const [thoughtProcess, setThoughtProcess] = useState('');

  useEffect(() => {
    // Initialize mask matrix (5x5 for this example)
    setMaskMatrix(Array(5).fill().map(() => Array(5).fill(true)));
  }, []);

  const handlePixelClick = (row, col) => {
    if (maskMatrix[row][col]) {
      const newMask = [...maskMatrix];
      newMask[row][col] = false;
      setMaskMatrix(newMask);
      setTurns(turns + 1);
    }
  };

  const handleProbabilityChange = (index, newValue) => {
    const newProbabilities = [...probabilities];
    newProbabilities[index] = parseFloat(newValue);
    
    // Normalize probabilities
    const sum = newProbabilities.reduce((a, b) => a + b, 0);
    const normalizedProbabilities = newProbabilities.map(p => p / sum);
    
    setProbabilities(normalizedProbabilities);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">MNIST Digit Guessing Game</h1>
      <p className="mb-4">Turns: {turns}</p>
      
      <div className="flex">
        <div className="mr-8">
          <div className="grid grid-cols-5 gap-1">
            {maskMatrix.map((row, rowIndex) => 
              row.map((masked, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-8 h-8 cursor-pointer ${masked ? 'bg-red-500' : 'bg-blue-500'}`}
                  onClick={() => handlePixelClick(rowIndex, colIndex)}
                />
              ))
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={probabilities.map((p, i) => ({ digit: i, probability: p }))}>
              <XAxis dataKey="digit" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="probability" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4">
            {probabilities.map((p, i) => (
              <div key={i} className="mb-2">
                <label className="block">Digit {i}</label>
                <Slider
                  value={p}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(e) => handleProbabilityChange(i, e.target.value)}
                />
                <span>{(p * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <label className="block mb-2">Thought Process</label>
            <Textarea
              value={thoughtProcess}
              onChange={(e) => setThoughtProcess(e.target.value)}
              placeholder="Explain your reasoning..."
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MNISTGame;
