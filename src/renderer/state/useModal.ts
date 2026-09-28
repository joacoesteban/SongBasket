import { readonly, shallowRef } from 'vue'

import type { SpotifyPlaylistId, SpotifyTrackId } from '../../@types/Spotify'

export type ModalRequest =
  | { kind: 'unsync'; playlistId: SpotifyPlaylistId }
  | { kind: 'custom-track-url'; trackId: SpotifyTrackId }

const modalRef = shallowRef<ModalRequest | null>(null)

export const useModal = () => ({
  modal: readonly(modalRef),
  openModal: (request: ModalRequest): void => {
    modalRef.value = request
  },
  closeModal: (): void => {
    modalRef.value = null
  }
})
