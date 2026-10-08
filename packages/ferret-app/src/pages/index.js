import Ferret from './Ferret';
import GlobalStyle from '../globalStyles';
import '../i18n';
import Main from './Main';

export default function App() {
  return (
    <div>
      <main>
        <Main>
          <GlobalStyle />
          <Ferret />
        </Main>
      </main>
    </div>
  );
}
