import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X, Star, MapPin, Calendar } from 'lucide-react';
import {
  getJourneyContent, getJourneyBranches, getPublicTestimonialPhotos,
} from '../services/supabaseApi';
import TestimonialPhotoCarousel from '../components/common/TestimonialPhotoCarousel';
import Reveal, { AnimatedCounter } from '../components/common/Reveal';
import Logo from '../components/common/Logo';

export default function OurJourneyPage() {
  const [timeline, setTimeline] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [albumViewer, setAlbumViewer] = useState(null); // { images: [...], index, title }
  const [community, setCommunity] = useState([]);
  const [branches, setBranches] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [photoTestimonials, setPhotoTestimonials] = useState([]);
  const [galleryFilter, setGalleryFilter] = useState('All');
  const [lightbox, setLightbox] = useState(null); // { type: 'project'|'gallery'|'story', item }
  const [lightboxZoomed, setLightboxZoomed] = useState(false); // double-click toggles a closer zoom on project/gallery photos

  useEffect(() => {
    document.title = 'Our Journey, Ticano Group';
    getJourneyContent('timeline').then(({ data }) => setTimeline(data)).catch(() => {});
    getJourneyContent('project').then(({ data }) => setProjects(data)).catch(() => {});
    getJourneyContent('team').then(({ data }) => setTeam(data)).catch(() => {});
    getJourneyContent('community').then(({ data }) => setCommunity(data)).catch(() => {});
    getJourneyBranches().then(({ data }) => setBranches(data)).catch(() => {});
    getJourneyContent('milestone').then(({ data }) => setMilestones(data)).catch(() => {});
    getJourneyContent('gallery').then(({ data }) => setGallery(data)).catch(() => {});
    getPublicTestimonialPhotos().then(({ data }) => setPhotoTestimonials(data)).catch(() => {});
    window.scrollTo(0, 0);
  }, []);

  const scrollToStory = () => document.getElementById('journey-timeline')?.scrollIntoView({ behavior: 'smooth' });

  const galleryCategories = ['All', ...new Set(gallery.map((g) => g.subtitle).filter(Boolean))];
  const filteredGallery = galleryFilter === 'All' ? gallery : gallery.filter((g) => g.subtitle === galleryFilter);

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <JourneyNavbar />

        {/* HERO */}
        <section
          className="relative h-[70vh] min-h-[480px] flex items-center justify-center overflow-hidden bg-ticano-charcoal bg-cover bg-center"
          style={{ backgroundImage: "url('/images/gaborone-wide.jpg')" }}
        >
          <div className="absolute inset-0 bg-ticano-charcoal/90" />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-5">Our Journey</h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Every business has a story. So do we. Explore the people, partnerships, projects and milestones that define Ticano.
            </p>
            <button onClick={scrollToStory} className="inline-flex items-center gap-2 px-7 py-3.5 bg-ticano-red text-white rounded-xl font-semibold hover:bg-ticano-red-dark transition-all shadow-lg hover:shadow-xl">
              Explore Our Story <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* STORY TIMELINE */}
        {timeline.length > 0 && (
          <section id="journey-timeline" className="py-20 px-4 max-w-4xl mx-auto">
            <SectionHeading eyebrow="How We Got Here" title="Story Timeline" />
            <div className="relative mt-14 pl-8 sm:pl-0">
              <div className="absolute left-3 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 sm:-translate-x-1/2" />
              {timeline.map((t, i) => (
                <Reveal key={t.id} animation={i % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'} className="mb-10 last:mb-0">
                  <div className={`sm:flex items-center gap-8 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="hidden sm:block sm:w-1/2" />
                    <div className="absolute left-3 sm:left-1/2 w-3 h-3 rounded-full bg-ticano-red -translate-x-1/2 mt-1.5 ring-4 ring-white dark:ring-gray-900" />
                    <div className="sm:w-1/2">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        {t.imageUrl && (
                          <div className="relative">
                            <img
                              src={t.imageUrl} alt={t.title} loading="lazy"
                              className={`w-full h-40 object-cover ${t.extraImages?.length > 0 ? 'cursor-pointer' : ''}`}
                              onClick={() => t.extraImages?.length > 0 && setAlbumViewer({ images: [t.imageUrl, ...t.extraImages].filter(Boolean), index: 0, title: t.title })}
                            />
                            {t.extraImages?.length > 0 && (
                              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">+{t.extraImages.length} more</span>
                            )}
                          </div>
                        )}
                        <div className="p-5">
                          {t.meta && <p className="text-xs font-semibold text-ticano-red mb-1 flex items-center gap-1"><Calendar size={11} /> {t.meta}</p>}
                          <h3 className="font-bold text-ticano-charcoal dark:text-white">{t.title}</h3>
                          {t.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{t.description}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* TESTIMONIALS (photos), customers and team sharing their
            journey visually, separate from the star-rating Success
            Stories above (sometimes the story is embedded in the photo
            itself, with no separate caption needed). */}
        {photoTestimonials.length > 0 && (
          <section className="py-20 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 mb-10">
              <SectionHeading eyebrow="Real Journeys" title="Testimonials" />
            </div>
            <TestimonialPhotoCarousel photos={photoTestimonials} />
          </section>
        )}

        {/* PROJECTS WE'VE FINANCED */}
        {projects.length > 0 && (
          <section className="py-20 max-w-6xl mx-auto px-4">
            <SectionHeading eyebrow="Real Impact" title="Projects We've Financed" />
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 mt-14 [column-fill:_balance]">
              {projects.map((p, i) => (
                <Reveal key={p.id} delay={i * 60} className="break-inside-avoid mb-5">
                  <button onClick={() => { setLightboxZoomed(false); setLightbox({ type: 'project', item: p }); }} className="block w-full text-left group">
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                      {p.imageUrl && (
                        <div className="overflow-hidden relative">
                          <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {p.extraImages?.length > 0 && (
                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">+{p.extraImages.length} more</span>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        {p.subtitle && <p className="text-[11px] font-semibold text-ticano-red uppercase tracking-wide mb-1">{p.subtitle}</p>}
                        <h3 className="font-bold text-ticano-charcoal dark:text-white text-sm">{p.title}</h3>
                        {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{p.description}</p>}
                      </div>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* MEET OUR MANAGEMENT TEAM */}
        {team.length > 0 && (
          <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
            <div className="max-w-6xl mx-auto px-4">
              <SectionHeading eyebrow="The People Behind Ticano" title="Meet Our Management Team" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mt-14 items-start">
                {team.map((m, i) => (
                  <Reveal key={m.id} delay={i * 70}>
                    <button
                      onClick={() => setSelectedTeamMember(m)}
                      className="w-full text-center rounded-2xl p-4 transition-all duration-300 hover:bg-white dark:hover:bg-gray-900/60 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {m.imageUrl && <img src={m.imageUrl} alt={m.title} loading="lazy" className="w-24 h-24 rounded-full object-cover mx-auto mb-3 shadow-sm" />}
                      <p className="font-bold text-sm text-ticano-charcoal dark:text-white">{m.title}</p>
                      {m.meta && <p className="text-xs text-ticano-red font-semibold mt-0.5">{m.meta}</p>}
                      {m.subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{m.subtitle}</p>}
                      {m.description && <p className="text-[11px] text-gray-400 mt-2">Tap to read more</p>}
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Team member popup, enlarges on click rather than expanding
            in place, so the About text has real room to be read. */}
        {selectedTeamMember && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setSelectedTeamMember(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center animate-scale-in max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedTeamMember(null)} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center">
                <X size={16} />
              </button>
              {selectedTeamMember.imageUrl && (
                <img src={selectedTeamMember.imageUrl} alt={selectedTeamMember.title} className="w-28 h-28 rounded-full object-cover mx-auto mb-4 shadow-md" />
              )}
              <p className="font-bold text-lg text-ticano-charcoal dark:text-white">{selectedTeamMember.title}</p>
              {selectedTeamMember.meta && <p className="text-sm text-ticano-red font-semibold mt-1">{selectedTeamMember.meta}</p>}
              {selectedTeamMember.subtitle && <p className="text-xs text-gray-400 mt-0.5">{selectedTeamMember.subtitle} Branch</p>}
              {selectedTeamMember.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed text-left">{selectedTeamMember.description}</p>
              )}
              {selectedTeamMember.extraImages?.length > 0 && (
                <button
                  onClick={() => setAlbumViewer({
                    images: [selectedTeamMember.imageUrl, ...selectedTeamMember.extraImages].filter(Boolean),
                    index: 0,
                    title: selectedTeamMember.title,
                  })}
                  className="mt-4 flex items-center gap-2 mx-auto text-xs font-semibold text-ticano-red hover:text-ticano-red-dark"
                >
                  View {selectedTeamMember.extraImages.length + 1} photos <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* COMMUNITY IMPACT */}
        {community.length > 0 && (
          <section className="py-20 max-w-6xl mx-auto px-4">
            <SectionHeading eyebrow="Giving Back" title="Community Impact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
              {community.map((c, i) => (
                <Reveal key={c.id} delay={i * 70}>
                  <div
                    className={`relative rounded-2xl overflow-hidden group h-56 shadow-sm ${c.extraImages?.length > 0 ? 'cursor-pointer' : ''}`}
                    onClick={() => c.extraImages?.length > 0 && setAlbumViewer({ images: [c.imageUrl, ...c.extraImages].filter(Boolean), index: 0, title: c.title })}
                  >
                    {c.imageUrl && <img src={c.imageUrl} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {c.extraImages?.length > 0 && (
                      <span className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">+{c.extraImages.length} more</span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {c.subtitle && <p className="text-[10px] uppercase tracking-wide text-ticano-gold font-semibold mb-1">{c.subtitle}</p>}
                      <p className="font-bold text-white text-sm">{c.title}</p>
                      {c.description && <p className="text-xs text-white/70 mt-1 line-clamp-2">{c.description}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* BRANCH JOURNEY */}
        {branches.some((b) => b.photoUrl || b.description) && (
          <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
            <div className="max-w-6xl mx-auto px-4">
              <SectionHeading eyebrow="Growing Across Botswana" title="Branch Journey" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
                {branches.map((b, i) => (
                  <Reveal key={b.id} delay={i * 80}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                      {b.photoUrl && <img src={b.photoUrl} alt={b.name} loading="lazy" className="w-full h-36 object-cover" />}
                      <div className="p-4">
                        <p className="font-bold text-ticano-charcoal dark:text-white text-sm flex items-center gap-1.5"><MapPin size={13} className="text-ticano-red" /> {b.name}</p>
                        {b.openingYear && <p className="text-xs text-gray-400 mt-1">Opened {b.openingYear}</p>}
                        {b.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{b.description}</p>}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* AWARDS & MILESTONES */}
        {milestones.length > 0 && (
          <section className="py-20 bg-ticano-charcoal">
            <div className="max-w-6xl mx-auto px-4">
              <SectionHeading eyebrow="By The Numbers" title="Awards & Milestones" dark />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
                {milestones.map((m, i) => (
                  <Reveal key={m.id} delay={i * 100} animation="animate-scale-in">
                    <div className="text-center">
                      <p className="text-3xl sm:text-4xl font-bold text-white"><AnimatedCounter value={m.title} /></p>
                      <p className="text-xs sm:text-sm text-white/60 mt-2">{m.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* IMAGE GALLERY */}
        {gallery.length > 0 && (
          <section className="py-20 max-w-6xl mx-auto px-4">
            <SectionHeading eyebrow="In Pictures" title="Image Gallery" />
            <div className="flex gap-2 justify-center flex-wrap mt-8 mb-10">
              {galleryCategories.map((cat) => (
                <button key={cat} onClick={() => setGalleryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${galleryFilter === cat ? 'bg-ticano-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
              {filteredGallery.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    if (g.extraImages?.length > 0) {
                      setAlbumViewer({ images: [g.imageUrl, ...g.extraImages].filter(Boolean), index: 0, title: g.title || g.subtitle });
                    } else {
                      setLightboxZoomed(false); setLightbox({ type: 'gallery', item: g });
                    }
                  }}
                  className="block w-full mb-3 break-inside-avoid group"
                >
                  <div className="rounded-xl overflow-hidden relative">
                    <img src={g.imageUrl} alt={g.title || g.subtitle || 'Ticano'} loading="lazy" className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {g.extraImages?.length > 0 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">+{g.extraImages.length} more</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 bg-ticano-red">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to write your own success story?</h2>
            <p className="text-white/80 mb-7">Let's talk about financing your next order, contract, or invoice.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/register" className="px-6 py-3 bg-white text-ticano-red rounded-xl font-semibold hover:bg-gray-100 transition-colors">Get Started</Link>
              <Link to="/login" className="px-6 py-3 border border-white/40 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors">Client Portal</Link>
            </div>
          </div>
        </section>

        <JourneyFooter />
      </div>

      {/* LIGHTBOX, shared by Projects, Gallery, and Success Story "Read Full Story" */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { setLightbox(null); setLightboxZoomed(false); }}>
          <button onClick={() => { setLightbox(null); setLightboxZoomed(false); }} aria-label="Close" className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10">
            <X size={22} />
          </button>
          <div className={`max-w-2xl max-h-[85vh] w-full bg-white dark:bg-gray-800 rounded-2xl ${lightboxZoomed ? 'overflow-auto' : 'overflow-y-auto'}`} onClick={(e) => e.stopPropagation()}>
            {lightbox.type === 'project' && (
              <>
                {lightbox.item.imageUrl && (
                  <img
                    src={lightbox.item.imageUrl} alt={lightbox.item.title}
                    onDoubleClick={() => setLightboxZoomed((z) => !z)}
                    title="Double-click to zoom"
                    className={`select-none transition-transform duration-300 ${lightboxZoomed ? 'w-auto max-w-none scale-150 cursor-zoom-out' : 'w-full max-h-[50vh] object-cover cursor-zoom-in'}`}
                  />
                )}
                {!lightboxZoomed && (
                  <div className="p-6">
                    {lightbox.item.subtitle && <p className="text-xs font-semibold text-ticano-red uppercase tracking-wide mb-1">{lightbox.item.subtitle}</p>}
                    <h3 className="text-xl font-bold text-ticano-charcoal dark:text-white">{lightbox.item.title}</h3>
                    {lightbox.item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{lightbox.item.description}</p>}
                    {lightbox.item.meta && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"><span className="font-semibold">Financing impact:</span> {lightbox.item.meta}</p>}
                    {lightbox.item.extraImages?.length > 0 && (
                      <button
                        onClick={() => { setLightbox(null); setAlbumViewer({ images: [lightbox.item.imageUrl, ...lightbox.item.extraImages].filter(Boolean), index: 0, title: lightbox.item.title }); }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ticano-red hover:text-ticano-red-dark"
                      >
                        View all {lightbox.item.extraImages.length + 1} photos <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {lightbox.type === 'gallery' && (
              <img
                src={lightbox.item.imageUrl} alt={lightbox.item.title || 'Ticano'}
                onDoubleClick={() => setLightboxZoomed((z) => !z)}
                title="Double-click to zoom"
                className={`select-none transition-transform duration-300 ${lightboxZoomed ? 'w-auto max-w-none scale-150 cursor-zoom-out' : 'w-full object-contain cursor-zoom-in'}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Album viewer, for entries with multiple grouped photos (e.g.
          several shots from one community event). Separate from the
          lightbox above, which stays single-image for projects/gallery. */}
      {albumViewer && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setAlbumViewer(null)}>
          <button onClick={() => setAlbumViewer(null)} aria-label="Close" className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10">
            <X size={22} />
          </button>
          {albumViewer.images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setAlbumViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length })); }}
                aria-label="Previous photo"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
              >
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAlbumViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length })); }}
                aria-label="Next photo"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
              >
                <ArrowRight size={20} />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img src={albumViewer.images[albumViewer.index]} alt={albumViewer.title || 'Ticano'} className="w-full max-h-[75vh] object-contain rounded-xl select-none" />
            <div className="flex items-center justify-between mt-3 px-1">
              {albumViewer.title && <p className="text-white/80 text-sm font-medium truncate">{albumViewer.title}</p>}
              {albumViewer.images.length > 1 && <p className="text-white/50 text-xs shrink-0 ml-3">{albumViewer.index + 1} / {albumViewer.images.length}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionHeading({ eyebrow, title, dark = false }) {
  return (
    <Reveal>
      <div className="text-center">
        <p className="text-ticano-red font-semibold text-sm uppercase tracking-widest mb-3">{eyebrow}</p>
        <h2 className={`text-3xl sm:text-4xl font-bold ${dark ? 'text-white' : 'text-ticano-charcoal dark:text-white'}`}>{title}</h2>
      </div>
    </Reveal>
  );
}

// Minimal shared nav/footer for this page, same brand styling as the
// homepage, without duplicating LandingPage's much larger multi-section
// nav data (this page doesn't need same-page scroll-anchors).
function JourneyNavbar() {
  return (
    <nav className="sticky top-0 z-40 border-b transition-colors duration-300 bg-white/95 dark:bg-gray-900/95 border-gray-100 dark:border-gray-800 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="shrink-0"><Logo size={22} withTagline taglineClassName="text-gray-400 dark:text-gray-500 hidden sm:block" /></Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium hover:text-ticano-red transition-colors text-gray-600 dark:text-gray-300">Home</Link>
          <Link to="/login" className="px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors">Client Portal</Link>
        </div>
      </div>
    </nav>
  );
}

function JourneyFooter() {
  return (
    <footer className="bg-black text-white/50 py-10 text-center text-xs">
      <p>&copy; {new Date().getFullYear()} Ticano Group. No one should be small forever.</p>
      <Link to="/" className="text-white/70 hover:text-white mt-2 inline-block">← Back to Home</Link>
    </footer>
  );
}
