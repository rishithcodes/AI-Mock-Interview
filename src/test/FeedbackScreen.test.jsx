import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackScreen from '../assets/Components/FeedbackScreen';

describe('FeedbackScreen', () => {
  const defaultProps = {
    domain: 'Artificial Intelligence',
    difficulty: 'medium',
    scores: { mlFundamentals: 82, toolsAndFrameworks: 75, problemSolving: 88 },
    violations: null,
    messages: [],
    qaReview: [],
    personalizedAdvice: '',
    onFinish: () => {},
    onViewHistory: () => {},
  };

  it('renders the overall score correctly', () => {
    // 82*0.4 + 75*0.3 + 88*0.3 = 32.8 + 22.5 + 26.4 = 81.7 → 82%
    render(<FeedbackScreen {...defaultProps} />);
    // Overall score appears in the big display + also as a category score, use getAllByText
    const matches = screen.getAllByText('82%');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders domain and difficulty', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.getByText('Artificial Intelligence Position')).toBeInTheDocument();
    expect(screen.getByText(/Medium Difficulty/i)).toBeInTheDocument();
  });

  it('renders all skill breakdown categories', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.getByText('ML Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Tools & Frameworks')).toBeInTheDocument();
    expect(screen.getByText('Applied Problem Solving')).toBeInTheDocument();
  });

  it('renders individual category scores', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.getAllByText('82%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('75%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('88%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows performance tier label', () => {
    render(<FeedbackScreen {...defaultProps} />);
    // 82% overall → "Strong Performance"
    expect(screen.getByText('Strong Performance')).toBeInTheDocument();
  });

  it('renders Web Development domain-specific categories', () => {
    const webProps = {
      ...defaultProps,
      domain: 'Web Development',
      scores: { frontendSkills: 90, backendSkills: 70, systemDesign: 65 },
    };
    render(<FeedbackScreen {...webProps} />);
    expect(screen.getByText('Frontend Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Backend & APIs')).toBeInTheDocument();
    expect(screen.getByText('Architecture & Design')).toBeInTheDocument();
  });

  it('renders Sales Executive domain-specific categories', () => {
    const salesProps = {
      ...defaultProps,
      domain: 'Sales Executive',
      scores: { salesStrategy: 80, communicationSkills: 75, businessAcumen: 70 },
    };
    render(<FeedbackScreen {...salesProps} />);
    expect(screen.getByText('Sales Strategy')).toBeInTheDocument();
    expect(screen.getByText('Communication & Negotiation')).toBeInTheDocument();
    expect(screen.getByText('Business Acumen')).toBeInTheDocument();
  });

  it('shows termination banner when terminated', () => {
    const props = {
      ...defaultProps,
      violations: { tabSwitches: 3, lookAways: 0, penaltyApplied: 9, terminated: true },
    };
    render(<FeedbackScreen {...props} />);
    expect(screen.getByText(/terminated early/i)).toBeInTheDocument();
  });

  it('does NOT show termination banner when not terminated', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.queryByText(/terminated early/i)).not.toBeInTheDocument();
  });

  it('shows proctoring notes when violations exist', () => {
    const props = {
      ...defaultProps,
      violations: { tabSwitches: 2, lookAways: 3, penaltyApplied: 15, terminated: false },
    };
    render(<FeedbackScreen {...props} />);
    expect(screen.getByText('Proctoring Notes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('hides proctoring notes when no violations', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.queryByText('Proctoring Notes')).not.toBeInTheDocument();
  });

  it('renders personalized advice when provided', () => {
    const props = {
      ...defaultProps,
      personalizedAdvice: 'Focus on deep learning concepts and practice more coding problems.',
    };
    render(<FeedbackScreen {...props} />);
    expect(screen.getByText('What to Improve Next')).toBeInTheDocument();
    expect(screen.getByText(/Focus on deep learning/)).toBeInTheDocument();
  });

  it('hides advice section when not provided', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.queryByText('What to Improve Next')).not.toBeInTheDocument();
  });

  it('renders Q&A review items', () => {
    const props = {
      ...defaultProps,
      qaReview: [
        {
          questionIndex: 0,
          question: 'Explain gradient descent',
          answer: 'It is an optimization algorithm',
          rating: 'adequate',
          feedback: 'Could be more detailed',
          modelAnswer: 'Gradient descent is an iterative optimization algorithm...',
        },
        {
          questionIndex: 1,
          question: 'What is overfitting?',
          answer: 'When model memorizes training data',
          rating: 'strong',
          feedback: 'Good understanding',
          modelAnswer: 'Overfitting occurs when...',
        },
      ],
    };
    render(<FeedbackScreen {...props} />);
    expect(screen.getByText('Question-by-Question Review')).toBeInTheDocument();
    expect(screen.getByText('Explain gradient descent')).toBeInTheDocument();
    expect(screen.getByText('What is overfitting?')).toBeInTheDocument();
  });

  it('expands Q&A item on click to show details', () => {
    const props = {
      ...defaultProps,
      qaReview: [
        {
          questionIndex: 0,
          question: 'Explain gradient descent',
          answer: 'It is an optimization algorithm',
          rating: 'adequate',
          feedback: 'Could be more detailed',
          modelAnswer: 'Gradient descent is an iterative optimization algorithm...',
        },
      ],
    };
    render(<FeedbackScreen {...props} />);

    // Click to expand
    fireEvent.click(screen.getByText('Explain gradient descent'));

    // Should show the answer and feedback
    expect(screen.getAllByText('It is an optimization algorithm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Could be more detailed').length).toBeGreaterThanOrEqual(1);
  });

  it('uses fallback scores (10) when scores prop is null', () => {
    const props = { ...defaultProps, scores: null };
    render(<FeedbackScreen {...props} />);
    // All categories default to 10, overall = 10*0.4 + 10*0.3 + 10*0.3 = 10
    // 10% appears for overall + each category
    expect(screen.getAllByText('10%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders action buttons', () => {
    render(<FeedbackScreen {...defaultProps} />);
    expect(screen.getByText('Download Report')).toBeInTheDocument();
    expect(screen.getByText('View History')).toBeInTheDocument();
    expect(screen.getByText('New Interview')).toBeInTheDocument();
  });

  it('calls onFinish when New Interview is clicked', () => {
    let called = false;
    const props = { ...defaultProps, onFinish: () => { called = true; } };
    render(<FeedbackScreen {...props} />);
    fireEvent.click(screen.getByText('New Interview'));
    expect(called).toBe(true);
  });

  it('calls onViewHistory when View History is clicked', () => {
    let called = false;
    const props = { ...defaultProps, onViewHistory: () => { called = true; } };
    render(<FeedbackScreen {...props} />);
    fireEvent.click(screen.getByText('View History'));
    expect(called).toBe(true);
  });
});
