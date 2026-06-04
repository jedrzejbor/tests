# Frontend - przewodnik dla osoby przejmujacej

Ten dokument opisuje, gdzie czego szukac w frontendzie i jak bezpiecznie robic typowe zmiany. Projekt jest aplikacja React + TypeScript + Vite, z UI opartym o MUI.

## Szybki start

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

Konfiguracja API jest w `src/config/api.ts`. Domyslnie frontend uzywa `VITE_API_BASE_URL`, a jesli zmienna nie jest ustawiona, bierze `http://localhost`.

## Najwazniejsze katalogi

- `src/pages` - ekrany aplikacji, np. listy, szczegoly, formularz szkody.
- `src/components/lists` - generyczny system list: tabela desktop, karty mobile, toolbar, filtry, sortowanie, akcje.
- `src/components/dialogs` - modale dodawania/edycji/archiwizacji/usuwania.
- `src/services` - komunikacja z API i typy danych dla domen.
- `src/routes/router.tsx` - mapa tras.
- `src/layouts` i `src/components/layout` - layout aplikacji, breadcrumby, shell.
- `src/store` - Zustand: auth, UI/toasty, stan list.
- `src/hooks` - wspolne hooki, m.in. `usePermission` i kontroler list.
- `src/types/genericList.ts` - kontrakt generycznych list.
- `src/utils/formSchemas.ts` - schematy formularzy.

## Trasy

Glowna mapa tras jest w `src/routes/router.tsx`.

Najczesciej uzywane trasy:

- `/app/users` i `/app/users/:userId`
- `/app/clients` i `/app/clients/:clientId`
- `/app/policies` i `/app/policies/:policyId`
- `/app/damages` - lista szkod
- `/app/damages/new` - zgloszenie szkody
- `/app/damages/:claimId` - szczegoly szkody
- `/app/damages/:claimId/edit` - edycja szkody
- `/app/payments`

Strony sa owijane przez `ProtectedRoute` albo `PublicRoute`.

## API i serwisy

Wszystkie requesty powinny isc przez `src/services/apiClient.ts`. Klient automatycznie dodaje token z `authStore` i przy `401` resetuje sesje oraz przekierowuje na login.

Endpointy sa w `src/config/api.ts`. Serwisy sa domenowe:

- `usersService.ts`
- `clientsService.ts`
- `policiesService.ts`
- `claimsService.ts`
- `paymentsService.ts`
- `documentsService.ts`
- `authService.ts`

Zasada: strona nie powinna skladac recznie URL-i do API, tylko korzystac z funkcji serwisu. Wyjatkiem moga byc tymczasowe/debugowe rzeczy, ale lepiej ich nie zostawiac.

## Generyczne listy

Listy uzywaja `GenericListView` z `src/components/lists/GenericListView.tsx`.

Glowne elementy:

- `GenericListView.tsx` - laczy fetcher, filtry, sortowanie, paginacje, akcje i renderery.
- `DesktopTableRenderer.tsx` - tabela desktop.
- `MobileCardListRenderer.tsx` - karty mobile.
- `ListToolbar.tsx` - toolbar, wyszukiwarka, filtry i sortowanie mobile.
- `useGenericListController.ts` - stan listy, fetch, paginacja, sortowanie, filtry, selekcja.
- `types/genericList.ts` - typy `GenericRecord`, `Fetcher`, `ActionDef`, `ExtraRowAction`.

Minimalny wzorzec strony z lista:

```tsx
<GenericListView<MyRecord>
  title="Lista"
  fetcher={fetchMyTable}
  handlers={handlers}
  rowKey={(row) => String(row.id)}
  initialPerPage={10}
  refreshKey={refreshKey}
  stateKey="/app/my-route"
/>
```

Backend zwraca:

- `data` - wiersze,
- `meta.columnDefs` - kolumny,
- `meta.filtersDefs` - filtry,
- `meta.sortable` - sortowania,
- `meta.generalActions` - akcje nad lista,
- `row.actions` - akcje w menu trzech kropek.

Przyklady struktury odpowiedzi sa w `docs/GENERIC_LIST_EXAMPLES.md`.

## Akcje wiersza i klikniecie w rekord

Kazda strona z lista definiuje `handlers`, np.:

```tsx
const handlers = {
  'view-claim': handleViewClaim,
  'edit-claim': handleEditClaim,
  'archive-claim': handleArchiveClaim,
  'delete-claim': handleForceDeleteClaim,
  'restore-claim': handleRestoreClaim,
  'create-claim': handleCreateClaim
};
```

Akcje z backendu musza miec `handler`, ktory istnieje w mapie `handlers`.

Klikniecie w caly rekord otwiera szczegoly, jesli widoczna akcja ma label zawierajacy `Szczeg` albo handler `view` / `view-*`. To jest obslugiwane centralnie w `GenericListView`, `DesktopTableRenderer` i `MobileCardListRenderer`.

Jesli trzeba dodac akcje tylko po stronie frontu, uzyj `extraRowActions`.

## Filtry

Filtry przychodza z backendu jako `meta.filtersDefs`. Front wspiera m.in.:

- `select`
- `text`
- `date`
- `date_range`
- `range`

Dodatkowe nadpisania ustawiasz w `GenericListView`:

- `filterLabelOverrides`
- `filterTooltips`
- `filterTransformers`
- `filterTypeOverrides`
- `disabledFilters`

Pojedyncze selecty maja ikonke `x`, ktora czysci tylko dany filtr. Implementacja jest w `GenericListView.tsx` i `ListToolbar.tsx`.

## Uprawnienia

Do sprawdzania uprawnien uzywamy `usePermission()`:

```tsx
const { hasPermission } = usePermission();
const canCreatePolicy = hasPermission('policy create');
```

Typowe miejsca:

- bramki widoku listy,
- ukrywanie przyciskow dodawania,
- ukrywanie akcji edycji/archiwizacji/usuwania,
- widocznosc zakladek w szczegolach klienta/polisy.

Nie zakladaj, ze samo ukrycie na froncie wystarcza. Backend dalej powinien walidowac uprawnienia.

## Szczegoly klienta

Plik: `src/pages/ClientDetailsPage.tsx`.

Zakladki sa w `CLIENT_TABS`:

- Dane klienta
- Dokumenty
- Polisy
- Platnosci skladek
- Szkody
- Dodatkowe informacje

Kazda zakladka ma `originalIndex`, bo lista zakladek jest filtrowana po uprawnieniach. Przy dodawaniu nowej zakladki trzeba obsluzyc ja w dwoch miejscach:

- mobile content,
- desktop content.

Szkody klienta korzystaja z `createClientClaimsFetcher` z `claimsService.ts`.

## Szczegoly polisy

Plik: `src/pages/PolicyDetailsPage.tsx`.

W zakladce `Szkody` jest lista szkod przypisanych do polisy. To dobry punkt odniesienia, jesli trzeba zmieniac akcje szkod albo zachowanie listy w kontekscie encji nadrzednej.

Fetcher: `createPolicyClaimsFetcher` w `claimsService.ts`.

## Szkody

Glowna lista: `src/pages/ClaimsPage.tsx`.

Szczegoly: `src/pages/ClaimDetailsPage.tsx`.

Dodawanie i edycja: `src/pages/ReportClaimPage.tsx`.

Wazne zachowania formularza szkody:

- z listy szkod mozna samemu wybrac polise i potem ja zmienic,
- z karty polisy formularz moze dostac `?policyId=...`; wtedy polisa jest wstepnie ustawiona i zablokowana,
- w edycji szkody polisa jest zablokowana,
- dynamiczne pola formularza sa pobierane przez `fetchClaimFormDefinition(policyId)`.

Statyczne klucze formularza sa w `STATIC_FIELD_KEYS`.

## Dialogi

Dialogi sa w `src/components/dialogs`.

Typowy wzorzec:

- strona trzyma `selectedX`,
- akcja wiersza ustawia `selectedX` i otwiera dialog,
- dialog dostaje `open`, `onClose`, encje i `onSuccess`,
- `onSuccess` zwieksza `refreshKey`, zeby lista pobrala dane ponownie.

Przy archiwizacji/usuwaniu z haslem uzywane sa dialogi typu `ClaimPasswordDialog`, `ArchivePaymentDialog`, `ForceDelete...Dialog`.

## Stan globalny

- `authStore.ts` - token, dane usera, impersonacja, reset sesji.
- `uiStore.ts` - toasty i elementy UI.
- `listStateStore.ts` - zapamietany stan list po `stateKey`.

Jesli lista ma pamietac filtry/sortowanie po powrocie, nadaj jej stabilny `stateKey`, np. `/app/clients`.

## Style i UI

Projekt korzysta z MUI i stylowania przez `sx`.

Najczestsze komponenty:

- `Box`, `Stack`, `Typography`, `Button`, `IconButton`,
- `Card`, `Tabs`, `Drawer`, `Menu`, `Select`, `TextField`,
- ikony z `@mui/icons-material`.

Globalne style sa w `src/styles/global.css`, a motyw w `src/theme`.

Przy zmianach UI trzymaj istniejacy styl: neutralne kolory, kompaktowe spacingi, border radius zwykle `8px` lub `12px`, bez duzych marketingowych sekcji.

## Typowy workflow zmiany

1. Znajdz strone w `src/pages`.
2. Sprawdz, z jakiego serwisu korzysta.
3. Jesli to lista, sprawdz `handlers`, `extraRowActions`, `fetcher`, `disabledColumns`, `disabledFilters`.
4. Jesli to szczegoly z zakladkami, pamietaj o mobile i desktop.
5. Po zmianie uruchom:

```bash
npm run typecheck
npm run lint
```

Przy wiekszych zmianach:

```bash
npm run build
```

## Typowe zadania i gdzie je robic

Dodanie nowej kolumny na liscie:

- najlepiej backend: `meta.columnDefs` i dane w `data`,
- frontend tylko jesli potrzebny specjalny rendering w `DesktopTableRenderer` lub `MobileCardListRenderer`.

Dodanie nowego filtra:

- backend: `meta.filtersDefs`,
- frontend: opcjonalnie `filterLabelOverrides`, `filterTypeOverrides`, `filterTransformers`.

Dodanie akcji w trzech kropkach:

- backend: `row.actions`,
- frontend: handler w stronie,
- albo `extraRowActions`, jesli akcja ma byc dodana lokalnie.

Dodanie nowej listy w szczegolach klienta/polisy:

- dodaj fetcher w odpowiednim `service`,
- dodaj handlery i `refreshKey` w stronie,
- dodaj `GenericListView` w mobile i desktop content,
- dodaj dialogi akcji pod koniec komponentu.

Dodanie nowej strony:

- plik w `src/pages`,
- import i trasa w `src/routes/router.tsx`,
- opcjonalnie pozycja nawigacji w `src/config/navigation.ts` lub `src/layouts/AppLayout.tsx`.

## Rzeczy, na ktore uwazac

- Nie kasuj cudzych zmian w plikach. Repo moze byc w trakcie pracy.
- Nie duplikuj logiki list poza `GenericListView`, jesli da sie uzyc istniejacego mechanizmu.
- Przy filtrach uwazaj na roznice miedzy wartoscia wyswietlana a wartoscia wysylana do backendu. Do konwersji sluzy `filterTransformers`.
- Przy zakladkach po uprawnieniach uzywaj `originalIndex`, nie indeksu po filtrowaniu.
- Przy formularzach dynamicznych szkody nie zmieniaj przypadkowo kluczy z `STATIC_FIELD_KEYS`, bo backend moze ich oczekiwac.
- Przy plikach/zalacznikach sprawdz, czy endpoint wymaga JSON czy `FormData`.

## Minimalna checklista przed oddaniem zmiany

- Czy dziala desktop i mobile?
- Czy przyciski sa widoczne tylko z odpowiednimi uprawnieniami?
- Czy lista odswieza sie po akcji?
- Czy klikniecie w rekord nie psuje menu trzech kropek?
- Czy filtry i sortowanie nadal dzialaja?
- Czy `npm run typecheck` przechodzi?
- Czy `npm run lint` przechodzi?
