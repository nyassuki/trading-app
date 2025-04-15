/**
 * File: okxTechnicalAnalysis.js
 * Author: Yassuki
 * Description: Fetches real-time market data from OKX and applies all technical indicators.
 */

const axios = require('axios');
const TechnicalAnalysis = require('../../strategies/allTechnicalIndicators');
require('dotenv').config(); // Load API keys from .env file
const staticMethods = Object.getOwnPropertyNames("TechnicalAnalysis")
                          .filter(prop => typeof TechnicalAnalysis[prop] === '');

console.log(staticMethods); // ['staticMethod']
