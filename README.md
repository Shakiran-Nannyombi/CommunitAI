# CommunitAI: The AI Chief of Staff for Community Leaders

CommunitAI is a production-ready AI platform designed to automate the administrative burden of community management. Built on DigitalOcean Gradient AI, it transforms messy meeting recordings into structured action items, sentiment reports, and automated follow-ups.

## The Mission

Community leads often spend more time on spreadsheets and notes than on people. CommunitAI uses fine-tuned LLMs to handle the "boring stuff"—meeting transcription, task tracking, and community health monitoring—so leaders can focus on building belonging.

## Tech Stack & Architecture

- **AI Engine:** DigitalOcean Gradient AI (Fine-tuned Llama-3/Mistral models for Community Management).
- **Infrastructure:** DigitalOcean Droplets for the backend API and Spaces Object Storage for audio file hosting.
- **Backend:** Python (FastAPI/Flask) utilizing the Gradient Python SDK.
Frontend: Next.js / Tailwind CSS dashboard.

## Features

- **Smart Transcription:** Upload campus meeting audio for instant, high-accuracy text conversion.
- **Agentic Action Items:** Automatically identifies who is responsible for what and assigns deadlines.
- **Community Sentiment Analysis:** Uses a fine-tuned Gradient model to detect burnout or conflict within meeting transcripts.
- **Automated Summaries:** Generates "TL;DR" reports ready to be blasted to Discord or Slack.

## Setup & Installation

**Prerequisites**

1. A DigitalOcean Account.
2. A Gradient Access Token and Workspace ID.
3. Python 3.10+ installed.

- **Installation**

```bash
Clone the Repository:
bash
git clone https://github.com
cd CommunitAI
Use code with caution.
```

- **Environment Setup:**

```bash
Create a .env file in the root directory:
env
GRADIENT_ACCESS_TOKEN=your_token_here
GRADIENT_WORKSPACE_ID=your_workspace_id_here
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
Use code with caution.
```

- **Install Dependencies:**

```bash
pip install -r requirements.txt
Use code with caution.
```

- **Run the Application:**

```bash
python main.py
Use code with caution.
```

## License

Distributed under the MIT License. See LICENSE for more information.