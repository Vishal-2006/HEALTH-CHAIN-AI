# 🦙 Ollama Setup Guide for Health Chain AI

## **What is Ollama?**
Ollama is a **FREE local LLM** that runs on your computer, perfect for medical AI applications. It's:
- ✅ **100% FREE** - no API costs ever
- ✅ **Privacy-focused** - data never leaves your system
- ✅ **No rate limits** - unlimited usage
- ✅ **Works offline** - no internet required
- ✅ **HIPAA-compliant** - perfect for medical data

## **🚀 Quick Installation (5 minutes)**

### **Step 1: Download Ollama**
```bash
# Windows (PowerShell as Administrator)
winget install Ollama.Ollama

# Or download manually from: https://ollama.ai/download
```

### **Step 2: Install Dependencies**
```bash
# Navigate to your backend directory
cd health-backend

# Install new dependencies
npm install axios
```

### **Step 3: Pull Medical Model**
```bash
# Open terminal/command prompt and run:
ollama pull mistral:7b
```

### **Step 4: Test Installation**
```bash
# Test if Ollama is working
ollama run mistral:7b "Hello, are you working?"
```

## **🔧 Configuration**

### **Backend Configuration**
Your `health-backend/index.js` is already configured with:
- **Primary AI**: Ollama (Mistral 7B)
- **Backup AI**: Google Gemini (if API key available)
- **Fallback**: Deterministic rules (always available)

### **Model Selection**
```javascript
// In health-backend/index.js
const OLLAMA_CONFIG = {
  baseURL: 'http://localhost:11434/api',
  model: 'mistral:7b',  // Best for medical text
  timeout: 30000,
  enabled: true
};
```

## **📊 Available Models**

| Model | Size | RAM Required | Medical Accuracy | Speed |
|-------|------|-------------|------------------|-------|
| **mistral:7b** | 4GB | 8GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **llama2:13b** | 8GB | 16GB | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **codellama:7b** | 4GB | 8GB | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **llama2:7b** | 4GB | 8GB | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### **Recommended Models for Medical AI:**
```bash
# Best overall (recommended)
ollama pull mistral:7b

# Alternative options
ollama pull llama2:13b    # Better reasoning, more RAM
ollama pull codellama:7b  # Good for structured data
```

## **🛠️ System Requirements**

### **Minimum Requirements:**
- **RAM**: 8GB
- **Storage**: 10GB free space
- **CPU**: Modern multi-core processor
- **OS**: Windows 10+, macOS 10.15+, Linux

### **Recommended Requirements:**
- **RAM**: 16GB+
- **Storage**: 20GB free space
- **CPU**: Modern 6+ core processor
- **GPU**: Optional but recommended

## **🚀 Usage Examples**

### **Test Medical Analysis**
```bash
# Test medical data analysis
ollama run mistral:7b "Analyze this health data: Blood Sugar 120 mg/dL, Blood Pressure 140/90 mmHg"
```

### **Test OCR Text Parsing**
```bash
# Test medical text extraction
ollama run mistral:7b "Extract medical values from: Blood Sugar: 95 mg/dL, Cholesterol: 180 mg/dL"
```

## **🔍 Troubleshooting**

### **Common Issues:**

#### **1. "Ollama not found"**
```bash
# Restart terminal after installation
# Or add to PATH manually
```

#### **2. "Connection refused"**
```bash
# Start Ollama service
ollama serve

# Or restart Ollama
ollama stop
ollama start
```

#### **3. "Out of memory"**
```bash
# Use smaller model
ollama pull llama2:7b

# Or increase system RAM
```

#### **4. "Model not found"**
```bash
# Pull the model again
ollama pull mistral:7b

# Check available models
ollama list
```

### **Performance Optimization:**
```bash
# Use GPU acceleration (if available)
ollama run mistral:7b --gpu

# Adjust model parameters
ollama run mistral:7b --num-ctx 4096
```

## **📈 Benefits for Your Project**

### **✅ Privacy & Security:**
- **Patient data never leaves your system**
- **No external API calls**
- **HIPAA compliance by design**
- **Complete data control**

### **✅ Cost Savings:**
- **Zero API costs**
- **No monthly fees**
- **Unlimited processing**
- **No rate limits**

### **✅ Performance:**
- **Faster response times**
- **No network latency**
- **Consistent results**
- **Works offline**

### **✅ Reliability:**
- **No dependency on external services**
- **Always available**
- **No content restrictions**
- **Customizable for medical tasks**

## **🎯 Integration with Your App**

### **How It Works:**
1. **Patient uploads medical report**
2. **Tesseract.js extracts text** (OCR)
3. **Ollama analyzes text** (AI)
4. **Results displayed in dashboard**

### **Fallback Chain:**
1. **Primary**: Ollama (Mistral 7B)
2. **Backup**: Google Gemini (if available)
3. **Fallback**: Deterministic rules (always works)

## **🔧 Advanced Configuration**

### **Custom Model Training:**
```bash
# Create custom medical model
ollama create medical-ai -f Modelfile

# Modelfile content:
FROM mistral:7b
SYSTEM "You are a medical AI specialist..."
```

### **API Configuration:**
```javascript
// Custom Ollama settings
const OLLAMA_CONFIG = {
  baseURL: 'http://localhost:11434/api',
  model: 'mistral:7b',
  timeout: 30000,
  enabled: true,
  options: {
    temperature: 0.1,  // Low for consistency
    top_p: 0.9,
    max_tokens: 1000
  }
};
```

## **📱 Testing Your Setup**

### **1. Start Your Backend:**
```bash
cd health-backend
npm start
```

### **2. Check Ollama Status:**
```bash
# Should show available models
ollama list
```

### **3. Test Upload:**
- Upload a medical report
- Check console for "Processing with Ollama OCR..."
- Verify extracted data

### **4. Test AI Analysis:**
- Go to Doctor Dashboard
- Click "Analyze Health Data"
- Check console for "Processing with Ollama AI..."

## **🎉 Success Indicators**

You'll know it's working when you see:
- ✅ `✅ Ollama connection successful` in console
- ✅ `Processing with Ollama OCR...` when uploading
- ✅ `Processing with Ollama AI...` when analyzing
- ✅ Fast, consistent results
- ✅ No API costs or rate limits

## **🚀 Next Steps**

1. **Install Ollama** (5 minutes)
2. **Pull Mistral model** (10 minutes)
3. **Test with your app** (5 minutes)
4. **Enjoy free, private AI!** 🎉

---

**Need help?** Check the troubleshooting section or restart the setup process. Ollama is perfect for your Health Chain AI project! 🏥✨
