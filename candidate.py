
import os
import tempfile
import wave
import subprocess

import streamlit as st
import cohere
import firebase_admin
from firebase_admin import credentials, firestore
import sounddevice as sd
import numpy as np
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# =====================================
# Configuration and Credentials
# =====================================

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")

st.title("🎙️ AI Mock Interview - Candidate Page")
st.write("👉 Please submit your profile before starting the interview.")

if not COHERE_API_KEY:
    st.error("COHERE_API_KEY is missing. Add it to your local .env file.")
    st.stop()

if not FIREBASE_CREDENTIALS_PATH:
    st.error(
        "FIREBASE_CREDENTIALS_PATH is missing. "
        "Set it to your local Firebase service-account JSON file."
    )
    st.stop()

if not os.path.isfile(FIREBASE_CREDENTIALS_PATH):
    st.error("Firebase credentials file was not found. Check its path in .env.")
    st.stop()

# =====================================
# Initialize Firebase
# =====================================

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# =====================================
# Initialize Cohere
# =====================================

co = cohere.Client(COHERE_API_KEY)

# =====================================
# Candidate Profile Form
# =====================================

with st.form("candidate_profile_form"):
    name = st.text_input("Name")
    education = st.text_input("Education")
    job_role = st.text_input("Job Role")
    skills = st.text_area("Skills (comma separated)")
    work_experience = st.text_area("Work Experience")

    submitted = st.form_submit_button("✅ Submit Profile")

if submitted:
    if not name.strip() or not job_role.strip():
        st.error("Please enter your name and job role.")
        st.stop()

    # Save candidate profile to Firestore
    data = {
        "name": name.strip(),
        "education": education.strip(),
        "job_role": job_role.strip(),
        "skills": skills.strip(),
        "work_experience": work_experience.strip(),
    }

    try:
        db.collection("candidates").add(data)
        st.success("✅ Profile submitted successfully!")
    except Exception as exc:
        st.error(f"Could not save candidate profile: {exc}")
        st.stop()

    # =====================================
    # Generate First Interview Question
    # =====================================

    prompt = f"""
    I am conducting a job interview for the role of '{job_role}'.

    Candidate profile:
    - Name: {name}
    - Education: {education}
    - Job Role: {job_role}
    - Skills: {skills}
    - Work Experience: {work_experience}

    Generate the first interview question tailored to this candidate's profile.
    """

    try:
        response = co.generate(
            model="command",
            prompt=prompt,
            max_tokens=200,
        )
        question = response.generations[0].text.strip()
        st.session_state["interview_question"] = question
        st.session_state["candidate_profile"] = data
        st.session_state["candidate_submitted"] = True
    except Exception as exc:
        st.error(f"Could not generate the interview question: {exc}")

# Display the question outside the form so it remains visible on reruns.
if st.session_state.get("candidate_submitted"):
    question = st.session_state.get("interview_question", "")
    st.write("🤖 AI Generated Interview Question:")
    st.markdown(f"**Q: {question}**")

    # =====================================
    # Microphone Recording
    # =====================================

    st.write("🎙️ Answer the question using your microphone.")

    if st.button("🎤 Start Recording"):
        duration = 10
        sample_rate = 44100
        channels = 1

        try:
            st.warning("Recording... Speak now!")

            audio_data = sd.rec(
                int(duration * sample_rate),
                samplerate=sample_rate,
                channels=channels,
                dtype=np.int16,
            )
            sd.wait()

            with tempfile.NamedTemporaryFile(
                delete=False, suffix=".wav"
            ) as temp_wav_file:
                audio_path = temp_wav_file.name

            try:
                with wave.open(audio_path, "wb") as wf:
                    wf.setnchannels(channels)
                    wf.setsampwidth(2)
                    wf.setframerate(sample_rate)
                    wf.writeframes(audio_data.tobytes())

                st.success("✅ Recording finished!")
                st.write("📝 Converting speech to text...")

                # Requires a compatible local Ollama Whisper model.
                result = subprocess.run(
                    ["ollama", "run", "whisper", audio_path],
                    capture_output=True,
                    text=True,
                    timeout=180,
                    check=False,
                )

                if result.returncode != 0:
                    st.error(
                        "Speech transcription failed. Check that Ollama "
                        "is installed and the whisper model is available."
                    )
                    if result.stderr:
                        st.code(result.stderr)
                    st.stop()

                transcript = result.stdout.strip()

                if not transcript:
                    st.warning("No speech was transcribed. Please try again.")
                    st.stop()

                st.write("📝 Candidate's Answer:")
                st.write(transcript)

                # =====================================
                # Generate Follow-up Question
                # =====================================

                st.write("🤔 Generating follow-up question...")

                follow_up_prompt = f"""
                You are an AI interviewer conducting a job interview.

                The candidate's job role is:
                {st.session_state["candidate_profile"]["job_role"]}

                The original interview question was:
                {question}

                The candidate answered:
                {transcript}

                Generate one relevant follow-up question that is clear,
                professional, and assesses the candidate's technical skills,
                problem-solving ability, or relevant work experience.
                """

                follow_up_response = co.generate(
                    model="command",
                    prompt=follow_up_prompt,
                    max_tokens=200,
                )

                follow_up_question = (
                    follow_up_response.generations[0].text.strip()
                )

                st.write("🤖 AI Follow-up Question:")
                st.markdown(f"**Q: {follow_up_question}**")

            finally:
                if os.path.exists(audio_path):
                    os.remove(audio_path)

        except subprocess.TimeoutExpired:
            st.error("Transcription timed out. Please try recording again.")
        except Exception as exc:
            st.error(f"An error occurred during recording or processing: {exc}")
