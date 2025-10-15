/**
 * Universal CustomGPT Widget Proxy Server
 * 
 * Production-ready proxy server based on successful Docusaurus integration.
 * Handles all CustomGPT widget API requests securely with proper endpoint support.
 * 
 * Compatible with: React, Next.js, Vue, Angular, Svelte, and other frameworks
 * 
 * Setup:
 * 1. npm install express cors dotenv
 * 2. Create .env file with CUSTOMGPT_API_KEY=your_key_here
 * 3. node universal-customgpt-proxy.js
 * 
 * This is the DEFINITIVE proxy server - replaces all other proxy variants.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Configure dotenv with explicit path
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('🔧 Environment Debug:');
console.log(`   Working Directory: ${process.cwd()}`);
console.log(`   Script Directory: ${__dirname}`);
console.log(`   API Key Present: ${!!process.env.CUSTOMGPT_API_KEY}`);
console.log(`   API Key Length: ${process.env.CUSTOMGPT_API_KEY?.length || 0}`);
if (process.env.CUSTOMGPT_API_KEY) {
  console.log(`   API Key Preview: ${process.env.CUSTOMGPT_API_KEY.substring(0, 10)}...`);
}

// CORS - allow all origins for development, configure for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
    : true,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CustomGPT Universal Proxy'
  });
});

// Helper function to get agent ID with fallback
function getAgentId(projectId) {
  if (projectId && projectId !== 'undefined' && projectId !== 'null') {
    return projectId;
  }
  
  // Fallback to environment variables
  return process.env.REACT_APP_CUSTOMGPT_AGENT_ID || 
         process.env.NEXT_PUBLIC_CUSTOMGPT_AGENT_ID ||
         process.env.VITE_CUSTOMGPT_AGENT_ID ||
         process.env.CUSTOMGPT_AGENT_ID ||
         '78913'; // Default fallback
}

// Handle CustomGPT widget's expected endpoints with undefined projectId
app.post('/api/proxy/projects/undefined/conversations', async (req, res) => {
  console.log('Widget trying to POST to undefined endpoint - fixing automatically');
  
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const agentId = getAgentId('undefined');
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CUSTOMGPT_API_KEY not found in environment variables' 
    });
  }

  const customgptUrl = `https://app.customgpt.ai/api/v1/projects/${agentId}/conversations`;
  
  console.log(`[WIDGET FIX] Redirecting undefined project to agent ${agentId}`);
  console.log(`[PROXY] POST ${customgptUrl}`);

  try {
    const response = await fetch(customgptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[WIDGET PROXY ERROR]', error);
    res.status(500).json({ 
      error: 'Widget proxy request failed', 
      details: error.message 
    });
  }
});

// Handle CustomGPT widget's expected endpoints with any projectId
app.post('/api/proxy/projects/:projectId/conversations', async (req, res) => {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = req.params.projectId;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CUSTOMGPT_API_KEY not found in environment variables' 
    });
  }

  const agentId = getAgentId(projectId);
  const customgptUrl = `https://app.customgpt.ai/api/v1/projects/${agentId}/conversations`;
  
  console.log(`[WIDGET] POST ${customgptUrl}`);

  try {
    const response = await fetch(customgptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[WIDGET PROXY ERROR]', error);
    res.status(500).json({ 
      error: 'Widget proxy request failed', 
      details: error.message 
    });
  }
});

// Handle sending messages to conversations
app.post('/api/proxy/projects/:projectId/conversations/:conversationId/messages', async (req, res) => {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const { projectId, conversationId } = req.params;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CUSTOMGPT_API_KEY not found in environment variables' 
    });
  }

  const agentId = getAgentId(projectId);
  const customgptUrl = `https://app.customgpt.ai/api/v1/projects/${agentId}/conversations/${conversationId}/messages`;
  
  console.log(`[WIDGET] POST ${customgptUrl}`);
  console.log(`[WIDGET] Request body:`, JSON.stringify(req.body, null, 2));

  try {
    const response = await fetch(customgptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    // Check if response is ok first
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WIDGET PROXY ERROR] API Error:', response.status, errorText);
      res.status(response.status).json({ 
        error: 'CustomGPT API error', 
        details: errorText,
        status: response.status
      });
      return;
    }

    // Check if streaming response requested
    if (req.body.stream) {
      console.log(`[WIDGET] Handling streaming response`);
      
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Use Node.js readable stream
      const reader = response.body.getReader();
      
      const pump = async () => {
        try {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Debug: Log streaming chunks to see citations
            const chunk = decoder.decode(value, { stream: true });
            if (chunk.includes('citation')) {
              console.log('[STREAM CHUNK WITH CITATIONS]', chunk.substring(0, 500));
            }

            res.write(value);
          }
          res.end();
        } catch (streamError) {
          console.error('[STREAM ERROR]', streamError);
          res.end();
        }
      };
      
      pump();
      
    } else {
      // Handle non-streaming response
      try {
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('[JSON PARSE ERROR]', parseError.message);
        console.error('[RESPONSE TEXT]', textResponse);
        res.status(500).json({ 
          error: 'Failed to parse API response', 
          details: parseError.message,
          responseText: textResponse
        });
      }
    }

  } catch (error) {
    console.error('[WIDGET PROXY ERROR]', error);
    res.status(500).json({ 
      error: 'Widget proxy request failed', 
      details: error.message 
    });
  }
});

// Handle getting project settings
app.get('/api/proxy/projects/:projectId/settings', async (req, res) => {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = req.params.projectId;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CUSTOMGPT_API_KEY not found in environment variables' 
    });
  }

  const agentId = getAgentId(projectId);
  const customgptUrl = `https://app.customgpt.ai/api/v1/projects/${agentId}/settings`;
  
  console.log(`[WIDGET] GET ${customgptUrl}`);

  try {
    const response = await fetch(customgptUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[WIDGET PROXY ERROR]', error);
    res.status(500).json({ 
      error: 'Widget proxy request failed', 
      details: error.message 
    });
  }
});

// Handle getting project details
app.get('/api/proxy/projects/:projectId', async (req, res) => {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = req.params.projectId;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CUSTOMGPT_API_KEY not found in environment variables' 
    });
  }

  const agentId = getAgentId(projectId);
  const customgptUrl = `https://app.customgpt.ai/api/v1/projects/${agentId}`;
  
  console.log(`[WIDGET] GET ${customgptUrl}`);

  try {
    const response = await fetch(customgptUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[WIDGET PROXY ERROR]', error);
    res.status(500).json({ 
      error: 'Widget proxy request failed', 
      details: error.message 
    });
  }
});

// Fallback route - handle any unmatched /api/proxy/* requests
// Note: This must be the last route to act as a catch-all
app.use('/api/proxy', async (req, res) => {
  const apiKey = process.env.CUSTOMGPT_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'CUSTOMGPT_API_KEY not found in environment variables'
    });
  }

  // Extract the path after /api/proxy
  const apiPath = req.originalUrl.replace('/api/proxy', '');
  const customgptUrl = `${process.env.CUSTOMGPT_API_BASE_URL || 'https://app.customgpt.ai/api/v1'}${apiPath}`;

  console.log(`[FALLBACK PROXY] ${req.method} ${customgptUrl}`);

  try {
    const response = await fetch(customgptUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(req.headers['user-agent'] && { 'User-Agent': req.headers['user-agent'] })
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && {
        body: JSON.stringify(req.body)
      })
    });

    // Handle streaming responses (for chat)
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.writeHead(response.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true'
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
      return;
    }

    // Handle regular JSON responses
    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[FALLBACK PROXY ERROR]', error);
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log('\n🚀 CustomGPT Universal Proxy Server Started');
  console.log('==========================================');
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Widget proxy: http://localhost:${PORT}/api/proxy/*`);
  console.log(`🔑 API Key configured: ${process.env.CUSTOMGPT_API_KEY ? 'Yes ✅' : 'No ❌'}`);
  
  if (!process.env.CUSTOMGPT_API_KEY) {
    console.log('\n❌ MISSING API KEY:');
    console.log('   Please create a .env file in this directory with:');
    console.log('   CUSTOMGPT_API_KEY=your_api_key_here');
    console.log('   ');
    console.log('   Current working directory:', process.cwd());
    console.log('   Script directory:', __dirname);
  } else {
    console.log(`✅ Ready to proxy CustomGPT widget requests`);
    console.log(`🌐 Supports: React, Vue, Angular, Svelte, and other frameworks`);
  }
  console.log('==========================================\n');
});

module.exports = app;