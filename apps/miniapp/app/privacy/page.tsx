export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <section className="surface-card space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-subtle">
            Privacy
          </p>
          <h1 className="font-display text-2xl font-semibold text-text">
            Политика конфиденциальности
          </h1>
        </div>

        <div className="space-y-3 text-sm leading-6 text-subtle">
          <p>
            Medsearch помогает искать врачей, клиники, отзывы и актуальные акции в Минске. Мы не
            оказываем медицинские услуги и не оформляем запись внутри этого Mini App.
          </p>
          <p>
            В текущей версии сервиса могут обрабатываться технические данные Telegram Mini App и
            история поиска внутри интерфейса. Полная редакция политики будет опубликована отдельно
            по постоянной ссылке.
          </p>
          <p>
            Если вы хотите уточнить, исправить или скрыть информацию о враче или клинике, напишите
            в поддержку через бота или по контактам, указанным в канале проекта.
          </p>
        </div>
      </section>
    </main>
  );
}
