import React, { useState } from 'react';
import { prototypeUsers } from '../data';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    idNumber: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.idNumber || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSignUp) {
      if (!formData.name) {
        setError('Please enter your name');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      // Validate ID number format
      if (!formData.idNumber.match(/^[0-9-]+$/)) {
        setError('ID number should contain only numbers and hyphens');
        return;
      }

      // Sign up logic - in a real app, this would call an API
      const newUser = {
        idNumber: formData.idNumber,
        name: formData.name,
        role: formData.role
      };

      // Store user data in localStorage (demo purposes)
      const users = JSON.parse(localStorage.getItem('ccis_users') || '[]');
      
      // Check if user already exists
      if (users.some(u => u.idNumber === formData.idNumber)) {
        const idType = formData.role === 'student' ? 'Student Number' : 'Faculty/Admin Number';
        setError(`User with this ${idType} already exists`);
        return;
      }

      users.push({ ...newUser, password: formData.password });
      localStorage.setItem('ccis_users', JSON.stringify(users));

      // Auto login after signup
      onLogin(newUser);
    } else {
      // Login logic - check against prototype users
      const user = prototypeUsers.find(u => 
        u.idNumber === formData.idNumber && u.password === formData.password
      );

      if (user) {
        // Don't pass the password to the app
        const { password, ...userWithoutPassword } = user;
        onLogin(userWithoutPassword);
      } else {
        setError('Invalid ID number or password');
        setShowHint(true);
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({
      idNumber: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'student'
    });
  };

  // Get label based on role
  const getIdLabel = () => {
    if (formData.role === 'student') {
      return 'Student Number';
    }
    return 'Faculty/Admin Number';
  };

  const getIdPlaceholder = () => {
    if (formData.role === 'student') {
      return 'Enter your student number';
    }
    return 'Enter your faculty/admin number';
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <h1>CCIS CONNECT</h1>
          <p className="login-subtitle">
            Campus Digital Mapping & Resource Management
          </p>
          <p className="institution">
            Mariano Marcos State University
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          
          {error && <div className="error-message">{error}</div>}

          {isSignUp && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="idNumber">{getIdLabel()}</label>
            <input
              type="text"
              id="idNumber"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleInputChange}
              placeholder={getIdPlaceholder()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button type="submit" className="login-button">
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>

          {!isSignUp && showHint && (
            <div className="demo-credentials">
              <div className="demo-header">
                <span className="demo-icon">🔑</span>
                <strong>Demo Credentials</strong>
              </div>
              <div className="demo-list">
                <div className="demo-item">
                  <span className="demo-role">Student:</span>
                  <code>2021-00001</code> / <code>student123</code>
                </div>
                <div className="demo-item">
                  <span className="demo-role">Faculty:</span>
                  <code>FAC-2020-001</code> / <code>faculty123</code>
                </div>
                <div className="demo-item">
                  <span className="demo-role">Admin:</span>
                  <code>ADM-2018-001</code> / <code>admin123</code>
                </div>
              </div>
            </div>
          )}

          <div className="login-toggle">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button type="button" onClick={toggleMode} className="toggle-link">
                {isSignUp ? 'Log In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </form>

        <div className="login-footer">
          <p>🏛️ College of Computing and Information Sciences</p>
          <p className="prototype-badge">✨ Prototype Demo Version</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
