import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Footer.css';

const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="footer-content">
                <div className="footer-section">
                    <h2 className="footer-logo">KALEIDOPLAN</h2>
                    <p className="footer-tagline">Transform your event experience</p>
                </div>

                <div className="footer-section">
                    <h3 className="footer-section-title">Contact</h3>
                    <div className="footer-contact-row">
                        <i className="footer-icon fas fa-envelope"></i>
                        <span className="footer-contact-text">info@kaleidoplan.com</span>
                    </div>
                    <div className="footer-contact-row">
                        <i className="footer-icon fas fa-phone"></i>
                        <span className="footer-contact-text">+123 456 7890</span>
                    </div>
                    <div className="footer-contact-row">
                        <i className="footer-icon fas fa-map-marker-alt"></i>
                        <span className="footer-contact-text">123 Event St., City, Country</span>
                    </div>
                </div>

                <div className="footer-section">
                    <h3 className="footer-section-title">Follow Us</h3>
                    <div className="footer-social-row">
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="footer-social-button">
                            <i className="fab fa-twitter"></i>
                        </a>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-button">
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-button">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-social-button">
                            <i className="fab fa-linkedin-in"></i>
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom-bar">
                <p className="footer-copyright">© 2025 Kaleidoplan. All rights reserved.</p>
                <div className="footer-links">
                    <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                    <span className="footer-divider">|</span>
                    <Link to="/terms" className="footer-link">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;