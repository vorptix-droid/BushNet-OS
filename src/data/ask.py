#!/usr/bin/env python3
"""
=============================================================================
 BushNet ASPEN - Local Survival AI CLI Assistant
 Models: Qwen 2.5 0.5B (Fastest) & Qwen 2.5 1.5B (Deep Survival Reasoning)
 Usage:
   python3 ~/bushnet/ask.py "How do I make a solar still?"
   python3 ~/bushnet/ask.py --model 1.5b "Symptoms and treatment of snake bites"
   python3 ~/bushnet/ask.py  (Starts interactive survival chat mode)
=============================================================================
"""

import sys
import json
import urllib.request

OPERATOR = "lachlan"

def ask_qwen(prompt, model="qwen2.5:0.5b"):
    url = "http://localhost:11434/api/generate"
    system_prompt = (
        "You are BushNet ASPEN, an autonomous offline tactical survival intelligence assistant for "
        + OPERATOR
        + ". Provide direct, concise, life-saving field guidance."
    )
    payload = {
        "model": model,
        "prompt": system_prompt + "\n\nQuestion: " + prompt + "\nAnswer:",
        "stream": True
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            for line in response:
                if line:
                    chunk = json.loads(line.decode('utf-8'))
                    sys.stdout.write(chunk.get("response", ""))
                    sys.stdout.flush()
            sys.stdout.write("\n")
    except Exception as e:
        print("\n[Ollama Error] Could not connect to local Ollama service: " + str(e))
        print("Tip: Make sure ollama is installed and running ('ollama serve' or 'ollama run " + model + "').")

def main():
    args = sys.argv[1:]
    model = "qwen2.5:0.5b" # default model

    if "--model" in args:
        idx = args.index("--model")
        if idx + 1 < len(args):
            m_arg = args[idx + 1].lower()
            if "1.5" in m_arg:
                model = "qwen2.5:1.5b"
            elif "0.5" in m_arg:
                model = "qwen2.5:0.5b"
            args.pop(idx + 1)
            args.pop(idx)

    # If a prompt was passed as argument:
    if args:
        question = " ".join(args)
        print(f"\n[ASPEN AI ({model})] Asking: {question}\n" + "-"*50)
        ask_qwen(question, model)
        print("-" * 50)
        return

    # Interactive Chat Mode:
    print("=" * 60)
    print(f" 🌲 BushNet ASPEN Survival AI Terminal (Operator: {OPERATOR})")
    print(f" Active Model: {model} (Use /switch to toggle 0.5B / 1.5B, /quit to exit)")
    print("=" * 60)

    while True:
        try:
            user_input = input(f"\n[{model}] Ask ASPEN > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["/quit", "/exit", "exit", "quit", "q"]:
                print("Exiting ASPEN AI session. Stay safe!")
                break
            if user_input.lower() in ["/switch", "/toggle"]:
                model = "qwen2.5:1.5b" if model == "qwen2.5:0.5b" else "qwen2.5:0.5b"
                print(f"[MODEL SWITCHED] Now using: {model}")
                continue
            
            print("-" * 50)
            ask_qwen(user_input, model)
            print("-" * 50)
        except (KeyboardInterrupt, EOFError):
            print("\nSession closed.")
            break

if __name__ == "__main__":
    main()
