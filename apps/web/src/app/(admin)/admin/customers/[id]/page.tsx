import ClientProfile from './ClientProfile';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <ClientProfile userId={params.id} />;
}
