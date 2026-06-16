import { error } from '@sveltejs/kit';
import { TIPS } from '$lib/tips/tips';

export function entries() {
  return TIPS.map((t) => ({ slug: t.slug }));
}

export function load({ params }: { params: { slug: string } }) {
  const tip = TIPS.find((t) => t.slug === params.slug);
  if (!tip) throw error(404, '꿀팁을 찾을 수 없습니다');
  const related = (tip.related ?? [])
    .map((s) => TIPS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({ slug: t.slug, title: t.title }));
  return { tip, related };
}
