// @Requirement: BRD-2.1
// @Requirement: BRD-2.2
// @Requirement: BRD-2.3

import React, { useState } from 'react';
import Card from './Card';
import Button from './ui/Button';
import Select from './ui/Select';
import QUESTIONS from '../data/onboardingQuestions.json';

const OnboardingQuestionnaire = ({ onComplete }) => {
  const [answers, setAnswers] = useState({
    experience: 0,
    capital: 0,
    assets: 0
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSelect = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: Number(value) }));
    setError('');
  };

  const calculateResult = () => {
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    
    if (answers.experience === 0 || answers.capital === 0 || answers.assets === 0) {
      setError('Please answer all questions before proceeding.');
      return;
    }

    let persona = 'Beginner';
    let risk = 'Low';
    
    if (totalScore >= 7) {
      persona = 'High Net Worth Individual (HNI)';
      risk = 'High';
    } else if (totalScore >= 5) {
      persona = 'Retail Investor';
      risk = 'Medium';
    }

    setResult({ persona, risk, score: totalScore, answers });
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(result);
    }
  };

  if (result) {
    return (
      <Card title="Risk Profile Analysis Complete" subtitle="AI Engine Recommendation">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--brand-orange, #ff724c)', marginBottom: '10px' }}>
            {result.persona}
          </h2>
          <p className="card-note" style={{ marginBottom: '20px' }}>
            Based on your responses, you have been categorized as a <strong>{result.persona}</strong> with a <strong>{result.risk} Risk Focus</strong>.
          </p>
          
          <div style={{ textAlign: 'left', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '10px' }}>System Guardrails Applied:</h4>
            <ul className="card-note" style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
              {result.risk === 'Low' && (
                <>
                  <li>Restricted to broad-market equity mutual funds and liquid ETFs.</li>
                  <li>Zero exposure to digital assets or complex debt.</li>
                  <li>Quarterly rebalancing to prevent transaction fee erosion.</li>
                </>
              )}
              {result.risk === 'Medium' && (
                <>
                  <li>Balanced access across equities, mutual funds, and corporate bonds.</li>
                  <li>Strict single-stock limits (max 10% allocation).</li>
                  <li>Weekly/bi-weekly tactical rebalancing notifications.</li>
                </>
              )}
              {result.risk === 'High' && (
                <>
                  <li>Full multi-asset access (Crypto, Direct Bonds, Specialized Funds).</li>
                  <li>Higher position concentration allowances for specialized gains.</li>
                  <li>Real-time and daily asset allocation rebalancing alerts.</li>
                </>
              )}
            </ul>
          </div>

          <Button onClick={handleFinish} style={{ width: '100%', maxWidth: '200px' }}>
            Apply Profile Settings
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Onboarding Risk Questionnaire" subtitle="Determine your investment guardrails">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '20px' }}>
        {QUESTIONS.map((question) => (
          <div key={question.id}>
            <label className="card-note" style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
              {question.text}
            </label>
            <Select
              value={answers[question.id] || ''}
              onChange={(e) => handleSelect(question.id, e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="" disabled>-- Select an option --</option>
              {question.options.map((opt, idx) => (
                <option key={idx} value={opt.score}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      
      {error && <p style={{ color: 'var(--brand-orange, #ff724c)', marginBottom: '16px' }}>{error}</p>}
      
      <Button onClick={calculateResult} style={{ width: '100%' }}>
        Generate AI Risk Profile
      </Button>
    </Card>
  );
};

export default OnboardingQuestionnaire;
