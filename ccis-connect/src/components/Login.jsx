import React, { useState } from 'react';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'student'
  });
  const [error, setError] = useState('');

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
    if (!formData.email || !formData.password) {
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

      // Sign up logic - in a real app, this would call an API
      const newUser = {
        email: formData.email,
        name: formData.name,
        role: formData.role
      };

      // Store user data in localStorage (demo purposes)
      const users = JSON.parse(localStorage.getItem('ccis_users') || '[]');
      
      // Check if user already exists
      if (users.some(u => u.email === formData.email)) {
        setError('User with this email already exists');
        return;
      }

      users.push({ ...newUser, password: formData.password });
      localStorage.setItem('ccis_users', JSON.stringify(users));

      // Auto login after signup
      onLogin(newUser);
    } else {
      // Login logic - in a real app, this would call an API
      const users = JSON.parse(localStorage.getItem('ccis_users') || '[]');
      const user = users.find(u => u.email === formData.email && u.password === formData.password);

      if (user) {
        onLogin({
          email: user.email,
          name: user.name,
          role: user.role
        });
      } else {
        setError('Invalid email or password');
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'student'
    });
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
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
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
            <>
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

          <button type="submit" className="login-button">
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>

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
          <p>College of Computing and Information Sciences</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
