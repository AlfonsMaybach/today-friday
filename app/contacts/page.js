
export const metadata = { title: 'Контакты — Today Friday' };

export default function ContactsPage() {
  return <main className="legal-page"><article className="legal-card">
    <a className="legal-back" href="/">← Вернуться на Today Friday</a>
    <div className="legal-draft">Реквизиты требуют заполнения и утверждения</div>
    <h1>Контакты</h1>
    <h2>Оператор</h2>
    <p>ИП Евстигнеев Аким Евгеньевич<br />ИНН 503611244088</p>
    <p>ОГРНИП: 322508100177510 (ожидает сверки с выпиской ФНС)<br />Адрес: <span className="legal-placeholder">[УКАЗАТЬ]</span><br />Email: <span className="legal-placeholder">DoYouHaveDollars@mail.com</span><br />Телефон: <span className="legal-placeholder">[УКАЗАТЬ ПРИ НЕОБХОДИМОСТИ]</span></p>
    <h2>Поддержка</h2>
    <p>Порядок и срок ответа на обращения: <span className="legal-placeholder">[СОГЛАСОВАТЬ]</span>.</p>
  </article></main>;
}
