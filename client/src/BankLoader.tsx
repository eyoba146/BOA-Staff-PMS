
export default function BankLoader() {
  return (
    <div className="bank-loader">
      <div className="bank-loader__content">
        <div className="bank-loader__container">
          <div className="bank-loader__ring" />

          <img
            src="/abyssinia-logo.png"
            alt="Bank of Abyssinia"
            className="bank-loader__logo"
          />
        </div>

        <div className="bank-loader__text">
          <h1>Bank of Abyssinia</h1>
          <p>Staff Performance</p>
        </div>
      </div>
    </div>
  );
}
