from ask_bot import ask_bot


if __name__ == "__main__":
    question = input("Ваш вопрос по документам: ")
    print("--- Вопрос ---")
    print(question)
    print("\n--- Ответ бота ---")
    result = ask_bot(question)
    print(result["answer"])
    if result["sources"]:
        print("\n--- Источники ---")
        for source in result["sources"]:
            reference = source.get("reference")
            print(f"- {source['title']}" + (f" — {reference}" if reference else ""))